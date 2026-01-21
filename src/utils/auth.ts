import { betterAuth, BetterAuthPlugin, boolean } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import { oneTimeToken, username } from "better-auth/plugins"
import { parseSetCookie, stringifyCookie } from "cookie";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { MongoClientDB, Repository } from "../repository/Bootstrap";
import { body, oneOf } from "express-validator";
import { getConfiguredOAuthOptions } from "./oauthConfiguration";
import z4 from "zod/v4";
import { mongoClientInstance } from "./mongoClient";
import { AccountSetupState, checkSetupType, COMPLETED_STATES, isAccountSetupStateAllowed, sendCodeToEmail, sendCodeToPhone, SetupStates, verifyCode } from "./accountSecurityUtilities";

const db = mongoClientInstance.db(process.env.DB_NAME)

const emailAndPasswordOptions:any = {
    enabled: true
}

// We must use the old password verification system for servers which 
// have been upgraded from the previous release
const legacyPasswordVerification = {
    hash: async (password: string) => {
        // Custom password hashing
        return Encrypt(password, "AES256");
    },
    verify: async ({ hash, password }:{hash: string, password: string}) => {
        // Custom password verification
        return Decrypt(hash, "AES256") === password;
    }
}
if (process.env.USE_LEGACY_PASSWORD_HASHING === "true") {
  emailAndPasswordOptions.password = legacyPasswordVerification
}

// Interval in seconds between rotations of participant sessions
const PARTICIPANT_SESSION_ROTATION_INTERVAL = process.env.PARTICIPANT_SESSION_ROTATION_INTERVAL ? parseInt(process.env.PARTICIPANT_SESSION_ROTATION_INTERVAL) : 5 * 24 * 60 * 60
const PARTICIPANT_SESSION_UPDATE_AGE = process.env.PARTICIPANT_SESSION_UPDATE_AGE ? parseInt(process.env.PARTICIPANT_SESSION_UPDATE_AGE) : 1 * 24 * 60 * 60
const PARTICIPANT_SESSION_EXPIRE_IN = process.env.PARTICIPANT_SESSION_EXPIRE_IN ? parseInt(process.env.PARTICIPANT_SESSION_EXPIRE_IN) : 365 * 24 * 60 * 60

const STAFF_SESSION_EXPIRES_IN = process.env.STAFF_SESSION_EXPIRES_IN ? parseInt(process.env.STAFF_SESSION_EXPIRES_IN) : 5 * 24 * 60 * 60
const STAFF_SESSION_UPDATE_AGE = process.env.STAFF_SESSION_UPDATE_AGE ? parseInt(process.env.STAFF_SESSION_UPDATE_AGE) : 1 * 24 * 60 * 60



export function formatPrimaryKey(primaryKey:string|number|ObjectId) {
  if (primaryKey instanceof ObjectId || typeof primaryKey == 'number' ) {
    return primaryKey
  }
  try {
    const newPrimaryKey = new ObjectId(primaryKey)
    return newPrimaryKey
  }
  catch (e) {
    return primaryKey
  }
}

const customSessionLengthPlugin = () => {
  return {
    id: "participant-session-plugin",
    endpoints: {
      tryRotateSession: createAuthEndpoint(
        "participant-session-plugin",
        {
          method: "POST",
          use: [sessionMiddleware]
        },
        async (ctx) => {
          const internalAdapter = ctx.context.internalAdapter
          const currentSession = ctx.context.session

          // Check that this is a participant session
          // Check that the session is elligable to be rotated
          const sessionAge = (Date.now() - currentSession.session.createdAt.getTime()) / 1000
          if (currentSession.session.userType !== "participant" || sessionAge <= PARTICIPANT_SESSION_ROTATION_INTERVAL) {
            return ctx.json({sessionRotated: false})
          }

          // Create the new session
          const newSession = {
            user: currentSession.user,
            session: await internalAdapter.createSession(currentSession.user.id)
          }
          
          // Set the auth cookie
          ctx.context.setNewSession(newSession)
          await setSessionCookie(ctx, newSession)

          // Delete the old session
          await internalAdapter.deleteSession(currentSession.session.token)

          // Return the new session
          return ctx.json({ sessionRotated: true })
        }
      )
    },
    hooks: {
      after: [
        { // ON SUCCESSFUL LOGIN:
          //  -  Add authType (admin, participant, researcher) to the new session
          //  - Update expires at time 
          matcher: (ctx) => {
            return !ctx.context.newSession?.session.userType
          },
          handler: createAuthMiddleware(async (ctx) => {
            const session = ctx.context.newSession
            if (!session) { return }
            const internalAdapter = ctx.context.internalAdapter
            const TypeRepository = new Repository().getTypeRepository()
            let userType
            if (!session?.user.origin) {
              userType = "admin"
            } else {
              userType = (await TypeRepository._self_type(session?.user.origin)).toLowerCase()
            }

            // Set Staff expires at time
            // (Participant expires in is the default set in auth config)
            let expiresAt = undefined
            if (userType !== "participant") {
              expiresAt = new Date(session.session.createdAt.getTime() + (STAFF_SESSION_EXPIRES_IN * 1000))
            }

            const sessionUpdates = {
              userType: userType,
              expiresAt: expiresAt,
            }
            const updatedSession = await internalAdapter.updateSession(session?.session.token, sessionUpdates)
            if (updatedSession) {
              await ctx.context.setNewSession({session: updatedSession, user: session.user})
            }
          })
        },
        { // WHEN LOGGED IN: Refresh session expires in age based on the current session's userType
          // CAUTION: In order for the update to affect the cookie in the browser, the caller
          //          of the auth.api method must add the set-cookie header to the express
          //          response.
          matcher: (ctx) => {
            return !!ctx.context.session
          },
          handler: createAuthMiddleware(async (ctx) => {
            const internalAdapter = ctx.context.internalAdapter
            const currentSession = ctx.context.session
            if (!currentSession?.session.userType) {return}
            const sessionAge = (Date.now() - currentSession.session.createdAt.getTime()) / 1000
            
            let expiresAt
            if (currentSession.session.userType === "participant") {
              if (sessionAge > PARTICIPANT_SESSION_UPDATE_AGE) {
                expiresAt = new Date(Date.now() + (PARTICIPANT_SESSION_EXPIRE_IN * 1000))
              }
            } else {
              if (sessionAge > STAFF_SESSION_UPDATE_AGE) {
                expiresAt = new Date(Date.now() + (STAFF_SESSION_EXPIRES_IN * 1000))
              }
            }
            if (expiresAt) {
              const updatedSession = await internalAdapter.updateSession(currentSession.session.token, {expiresAt: expiresAt})
              if (updatedSession) {
                setSessionCookie(ctx, {user: currentSession.user, session: updatedSession})
              }
            }
          })
        }
      ], 
    }
  } satisfies BetterAuthPlugin
} 


const accountSetupPlugin = () => {
  // This plugin must come after customSessionLengthPlugin
  return {
    id: "account-setup-plugin",
    schema: {
      session: {
        fields: {
          require2FAVerification: {
            type: "boolean",
            required: false,
            returned: true
          },
          accountSetupState: {
            type: "string",
            required: false,
            returned: true
          }
        }
      },
      twoFactor: {
        fields: {
          userId: {
            type: "string",
            references: {
              model: "user",
              field: "id",
            }
          },
          email: {
            type: "string",
            required: false,
            returned: true
          },
          phone: {
            type: "string",
            required: false,
            returned: true
          },
          lastVerified: {
            type: "date",
            required: false,
            returned: true,
          },
          _deleted: {
            type: "boolean",
            required: true,
            returned: false
          },
        }
      },
    },
    endpoints: {
      configure2FA: createAuthEndpoint(
        "/custom-2fa/configure",
        {
          method: "POST",
          body: z4.xor([
            z4.object({email: z4.email(), phone: z4.undefined()}),
            z4.object({email: z4.undefined(), phone: z4.string().nonempty()})
          ]),
          use: [sessionMiddleware]
        },
        async (ctx) => {
          const {session, user} = ctx.context.session
          if (!user || !session) {return}

          // Only allow staff users who have not set up additional security (2fa or oauth) to configure
          const setupState = session.accountSetupState as AccountSetupState | undefined
          if (isAccountSetupStateAllowed(setupState, COMPLETED_STATES)) {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "2FA is already configured for this account"})
          }

          try {
            // Delete unverified two factor contacts
            if (setupState === SetupStates.TWO_FACTOR_UNVERIFIED) {
              await MongoClientDB.collection("twoFactor").updateMany(
                {
                  userId: formatPrimaryKey(user.id),
                  _deleted: false
                },
                {$set: {_deleted: true}}
              )
            }

            const insertResult = await MongoClientDB.collection("twoFactor").insertOne({
              userId: formatPrimaryKey(user.id),
              email: ctx.body.email,
              phone: ctx.body.phone,
              lastVerified: undefined,
              _deleted: false
            })
          } catch (e) {
            console.log("Failed to create new 2fa contact")
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "Failed to configure 2FA"})
          }

          // Send verification code
          try {
            let sendResult
            if (ctx.body.email) {
              sendResult = await sendCodeToEmail(ctx.body.email)
            } else {
              sendResult = await sendCodeToPhone(ctx.body.phone as string)
            }
            if (sendResult !== "ok") {
              throw new Error("500.failed-to-send")
            }
          } catch (e) {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "Failed to send verification"})
          }

          return ctx.json({
            message: "ok"
          })
        }
      ),
      send2FACode: createAuthEndpoint(
        "/custom-2fa/send",
        {
          method: "POST",
          use: [sessionMiddleware]
        },
        async (ctx) => {
          const {user, session} = ctx.context.session
          // Get active 2fa contact
          const activeContacts = await MongoClientDB.collection("twoFactor").find({
            userId: formatPrimaryKey(user.id),
            _deleted: false
          }).toArray()

          if (activeContacts.length === 1) {
            try {
              const contact = activeContacts[0]
              let sendResult
              if (contact.email) {
                sendResult = await sendCodeToEmail(contact.email)
              } else {
                sendResult = await sendCodeToPhone(contact.phone as string)
              }
              if (sendResult !== "ok") {
                throw new Error("500.failed-to-send")
              }
            } catch (e) {
              return ctx.error("INTERNAL_SERVER_ERROR", {message: "Failed to send code"})
            }
          } else if (activeContacts.length > 1) {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "Multiple 2FA contacts configured"})
          } else {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "2FA not configured"})
          }

          return ctx.json({
            message: "ok"
          })
        }
      ),
      verify2FACode: createAuthEndpoint(
        "/custom-2fa/verify",
        {
          method: "POST",
          body: z4.object({
            code: z4.string().nonempty()
          }),
          use: [sessionMiddleware]
        },
        async (ctx) => {
          const {user, session} = ctx.context.session
          // Get active 2fa contact
          const activeContacts = await MongoClientDB.collection("twoFactor").find({
            userId: formatPrimaryKey(user.id),
            _deleted: false
          }).toArray()
          if (activeContacts.length === 1) {
            try {
              const sendResult = await verifyCode(ctx.body.code, activeContacts[0].email || activeContacts[0].phone)
              if (sendResult !== "ok") {
                throw new Error("400.failed-to-verify")
              }
              await MongoClientDB.collection("twoFactor").updateOne(
                {_id: activeContacts[0]._id},
                {$set: {lastVerified: new Date(Date.now())}}
              )
              await ctx.context.internalAdapter.updateSession(
                session.token,
                {require2FAVerification: false}
              )
            } catch(e) {
              return ctx.error("INTERNAL_SERVER_ERROR", {message: "Failed to verify 2FA code"})
            }
          } else if (activeContacts.length > 1) {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "Multiple 2FA contacts configured"})
          } else {
            return ctx.error("INTERNAL_SERVER_ERROR", {message: "2FA not configured"})
          }

          // Send verification code
          return ctx.json({
            message: "ok"
          })
        }
      ),
      delete2FAConfiguration: createAuthEndpoint(
        "/custom-2fa/delete-configuration",
        {
          method: "POST",
          use: [sessionMiddleware]
        },
        async (ctx) => {
          if (!ctx.context.session) {return}
          const {session, user} = ctx.context.session
          // Delete active 2fa contact
          const activeContacts = await MongoClientDB.collection("twoFactor").updateMany({
            userId: new ObjectId(user.id),
            _deleted: false
          },
          {$set: {
            _deleted: true
          }}
        )
          return ctx.json({
            message: "ok"
          })
        }
      )
    },
    hooks: {
      after: [
        { // ON SUCCESSFUL LOGIN: 
          matcher: (ctx) => {
            return !!ctx.context.newSession
          },
          handler: createAuthMiddleware(async (ctx) => {
              if (!ctx.context.newSession) {return}
              const {session, user} = ctx.context.newSession
              const internalAdapter = ctx.context.internalAdapter

              const updatedSession = await internalAdapter.updateSession(
                session.token,
                {accountSetupState: await checkSetupType(user as Session["user"], session.userType)}
              )
              if (updatedSession) {
                ctx.context.setNewSession({session: updatedSession, user: user})
              }
          })
        },
        { // ON CREDENTIAL BASED LOGIN: Set require validation flag
          matcher: (ctx) => {
            return (ctx.path === "/sign-in/username" || ctx.path === "/sign-in/email") && !!ctx.context.newSession
          },
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.context.newSession) { return }
            const {session, user} = ctx.context.newSession
            console.log(session)
            if (session.require2FAVerification !== undefined) { return }
            const internalAdapter = ctx.context.internalAdapter
            
            let require2FAVerification
            if (session.userType === "participant" || user.additionalSetupExempt) {
              // These userTypes do not use 2FA
              require2FAVerification = false
            } else if (!isAccountSetupStateAllowed(session.accountSetupState, [SetupStates.TWO_FACTOR])) {
              // The account is not setup for 2FA
              require2FAVerification = false
            } else {
              const contacts = await MongoClientDB.collection("twoFactor").find({
                userId: formatPrimaryKey(user.id),
                _deleted: false
              }).toArray()
              require2FAVerification = contacts.length > 0
            }
            const updatedSession = await internalAdapter.updateSession(
              session.token,
              { require2FAVerification }
            )
            if (updatedSession) {
              ctx.context.setNewSession({session: updatedSession, user: user})
            }
          })
        },
        { // WHEN ACCOUNT SETUP IS INCOMPLETE: Check the accountSetupStage and update it if nessecary
          matcher: (ctx) => {
            const accountSetupState = ctx.context.session?.session.accountSetupState as AccountSetupState | undefined
            return isAccountSetupStateAllowed(accountSetupState, [SetupStates.INCOMPLETE, SetupStates.TWO_FACTOR_UNVERIFIED])
          },
          handler: createAuthMiddleware(async (ctx) => {
            const session = ctx.context.session
            if (!session) {return}
            const internalAdapter = ctx.context.internalAdapter
            const userType = session.session.userType
            
            const accountSetupState = await checkSetupType(session.user as Session["user"], userType)
            await internalAdapter.updateSession(session?.session.token, {accountSetupState})
          })
        },
      ]
    }
  } satisfies BetterAuthPlugin
}

export const auth = betterAuth({
    database: mongodbAdapter(db, {client: mongoClientInstance}),
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: emailAndPasswordOptions,
    account: {
      fields: {
        accountId: "_id",
      }
    },
    user: {
        modelName: "credential",
        fields: {
            email: "access_key"
        },
        additionalFields: {
            origin: {
                type: "string",
                required: false,
                returned: true,
            },
            description: {
                type: "string",
                defaultValue: "",
                required: false,
                returned: true,
            },
            _deleted: {
                type: "boolean",
                defaultValue: false,
                returned: true,
                input: false,
            },
            additionalSetupExempt: {
              type: "boolean",
              defaultValue: false,
              required: false,
              returned: true,
              input: true
            }
        },
    },
    session: {
      disableSessionRefresh: true,  // Handle session refresh manually
      additionalFields: {
        userType: {
          type: "string",
          required: false,
          returned: true
        },
        isSetupComplete: {
          type: "boolean",
          required: false,
          returned: true
        },
      }
    },
    hooks: {
      after: createAuthMiddleware({}, async (ctx) => {
        // Include the sessionCookie in the response after verifying a one-time-token
        if (ctx.path === "/one-time-token/verify") {
          const returned = ctx.context.returned as any
          if (returned?.session) {
            await setSessionCookie(ctx, returned)
          }
        }
      })
    },
    plugins:[
      customSessionLengthPlugin(),
      accountSetupPlugin(),
      oneTimeToken({
        disableClientRequest: true
      }),
      username({
        usernameValidator: async (username) => {
          // Allow usernames to be either emails, or strings with alphanumeric characters, underscores and dashes
          // Validation is currently a slightly hacky use of express-validator
          const req = {
            body: {
              username: username
            }
          }
          const emailValidationResult = await oneOf([body("username").isEmail(), body("username").matches(/^[\w\-]+$/)]).run(req)
          return emailValidationResult.isEmpty()
        } 
      })
    ],
    socialProviders: getConfiguredOAuthOptions(),
})


export type Session = typeof auth.$Infer.Session

export function convertSetCookieToCookie(headers:Headers) {
  // Extract all set-cookie headers from headers and return the cookie header string
  // This is used when we need to call an authenticated better-auth api end point immediately after
  // logging in
  const allSetCookies = (headers as any).getSetCookie().map((setCookie: string) => parseSetCookie(setCookie))
  const cookieDict = Object.fromEntries(allSetCookies.map((setCookie:any) => ([setCookie.name, setCookie.value])))
  return stringifyCookie(cookieDict)
}

// The Encrypt and Decrypt functions are used to support servers upgraded from basic auth servers

/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
export function Encrypt(data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined {
  try {
    if (mode === "Rijndael") {
      const cipher = crypto.createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "utf8", "base64") + cipher.final("base64")
    } else if (mode === "AES256") {
      const ivl = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl)
      return Buffer.concat([ivl, cipher.update(Buffer.from(data, "utf16le")), cipher.final()]).toString("base64")
    }
  } catch (error) {
    console.error("Encryption error:", error)
    return undefined
  }
}

/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */

export function Decrypt(data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined {
  try {
    if (mode === "Rijndael") {
      const cipher = crypto.createDecipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "base64", "utf8") + cipher.final("utf8")
    } else if (mode === "AES256") {
      const dat = Buffer.from(data, "base64")
      const cipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ROOT_KEY || "", "hex"),
        dat.slice(0, 16)
      )
      return Buffer.concat([cipher.update(dat.slice(16)), cipher.final()]).toString("utf16le")
    }
  } catch (error) {
    console.error("Encryption error:", error)
    return undefined
  }
}
