import { betterAuth, BetterAuthPlugin } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import { oneTimeToken, username } from "better-auth/plugins"
import { parseSetCookie, stringifyCookie } from "cookie";
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import { MongoClientDB, Repository } from "../repository/Bootstrap";
import { body, oneOf } from "express-validator";
import { getConfiguredOAuthOptions } from "./oauthConfiguration";

export const mongoClientInstance = new MongoClient(`${process.env.DB}`)
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
if (process.env.USE_LEGACY_PASSWORD_HASHING) {
    emailAndPasswordOptions.password = legacyPasswordVerification
}

// Interval in seconds between rotations of participant sessions
const PARTICIPANT_SESSION_ROTATION_INTERVAL = process.env.PARTICIPANT_SESSION_ROTATION_INTERVAL ? parseInt(process.env.PARTICIPANT_SESSION_ROTATION_INTERVAL) : 5 * 24 * 60 * 60
const PARTICIPANT_SESSION_UPDATE_AGE = process.env.PARTICIPANT_SESSION_UPDATE_AGE ? parseInt(process.env.PARTICIPANT_SESSION_UPDATE_AGE) : 1 * 24 * 60 * 60
const PARTICIPANT_SESSION_EXPIRE_IN = process.env.PARTICIPANT_SESSION_EXPIRE_IN ? parseInt(process.env.PARTICIPANT_SESSION_EXPIRE_IN) : 365 * 24 * 60 * 60

const STAFF_SESSION_EXPIRES_IN = process.env.STAFF_SESSION_EXPIRES_IN ? parseInt(process.env.STAFF_SESSION_EXPIRES_IN) : 5 * 24 * 60 * 60
const STAFF_SESSION_UPDATE_AGE = process.env.STAFF_SESSION_UPDATE_AGE ? parseInt(process.env.STAFF_SESSION_UPDATE_AGE) : 1 * 24 * 60 * 60

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
        {
          // ON NEW SESSION
          // Add the authType to the new session (admin, participant, researcher...)
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
            let expiresAt = undefined
            if (userType !== "participant") {
              expiresAt = new Date(session.session.createdAt.getTime() + (STAFF_SESSION_EXPIRES_IN * 1000))
            }

            // Set isSetupComplete flag based on usertype
            let isSetupComplete
            if (process.env.DISABLE_REQUIRE_OAUTH_OR_2FA) {
              isSetupComplete = true
            } else if (userType === "participant") {
              isSetupComplete = true
            } else {
              // Account set up for staff users is incomplete if they do not have oAuth or 2FA configured
              // TODO: Add check for 2FA setup
              const oAuthAccounts = await MongoClientDB.collection("account")
                                                       .find({
                                                          providerId: {$ne: "credential"}, 
                                                          userId: new ObjectId(session.user.id)})
                                                        .toArray() 
              isSetupComplete = !!oAuthAccounts.length
            }

            const sessionUpdates = {
              userType: userType,
              expiresAt: expiresAt,
              isSetupComplete: isSetupComplete
            }
            await internalAdapter.updateSession(session?.session.token, sessionUpdates)
          })
        },
        {
          // Refresh session expires in age based on the current session's userRole
          // In order for the update to affect the cookie in the brower, the caller
          // of the auth.api method must add the set-cookie header to the express
          // response.
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


export const auth = betterAuth({
    database: mongodbAdapter(db, {client: mongoClientInstance}),
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true
    },
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
        }
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
      }),
    ],
    socialProviders: getConfiguredOAuthOptions()
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
        console.log("mode Rijneal")
      const cipher = crypto.createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "utf8", "base64") + cipher.final("base64")
    } else if (mode === "AES256") {
        console.log("mode aes256")
      const ivl = crypto.randomBytes(16)
      console.log("about to use key")
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl)
      console.log("used key")
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
