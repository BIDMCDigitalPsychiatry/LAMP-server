import { NextFunction, Request, Response } from "express";
import { auth, convertSetCookieToCookie, Session } from "../utils/auth";
import { isAccountSetupStateComplete } from "../utils/accountSecurityUtilities";
import { AccountSetupState } from "../utils/accountSecurityUtilities";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClientDB } from "../repository/Bootstrap";
import { parseSetCookie } from "cookie";
import { apiKey } from "better-auth/plugins";

export type ActingUserContext = {
  user: Session["user"];
  session: Session["session"];
  apiKey?: any;
  requestHeaders: any;
};

export type AuthRouteOptions = {
    allowMobileToken?: boolean,
    allowApiKey?: boolean,
    skipFullSetupCheck?: boolean,
    disallowSessionCookie?: boolean,
}

// By default authentication fails if the account is not fully set up
// To enable an end point for accounts with incomplete set up add skipFullSetupCheck
// to the middleware chain right before authenticateSession
export function skipFullSetupCheck(req: Request, res: Response, next: NextFunction) {
    res.locals.skipFullSetupCheck = true
    next()
}

export function configureAuth(options: AuthRouteOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        res.locals.authRouteOptions = options
        next()
    }
}

// Session authentication middleware
// If the request comes from an authenticated user add the session to the request context
// If the request does not come from an authenticated user, return an unauthenticated response instead
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
    const options = res.locals.authRouteOptions || {
        skipFullSetupCheck: res.locals.skipFullSetupCheck
    } as AuthRouteOptions
    console.log("> ", options)
    let actingUserContext = undefined
    // If mobile auth is allowed, try authenticating with a mobile token
    if (options.allowMobileToken) {
        console.log("CHECK MOBILE")
        actingUserContext = await authenticateMobileSession(req, res)
    }

    // If api key auth is allowed, try authenticating with an api key
    if (!actingUserContext && options.allowApiKey) {
        console.log("CHECK API KEY")
        actingUserContext = await authenticateApiKey(req, res)
    }

    // Otherwise, try authenticating with a session cookie
    if (!options.disallowSessionCookie && !actingUserContext) {
        console.log("CHECK SESSION COOKIE")
        actingUserContext = await authenticateSessionCookie(req, res)
    }

    // If we have not found an ActingUserContext, throw
    if (!actingUserContext) {
        // TODO bring back good errors
        res.status(403)
        res.json({message: "403.no-such-credentials"})
        return 
    }

    const {user, session} = actingUserContext
    // Check deleted
    if (user._deleted) {
        const deleteResult = await MongoClientDB.collection("session")
                                                .deleteOne({token: session.token})
        res.status(403)
        res.json({message: "403.no-such-credentials"})
        return
    }

    // Default to disallowing requests from not fully set up accounts
    if (!options.skipFullSetupCheck && 
        !isAccountSetupStateComplete(user.accountSetupState as AccountSetupState | undefined)) {
        res.status(403)
        res.json({message: "403.require-account-setup"})
        return
    }

    // Default to disallowing requests from unverified sessions
    if (!options.skipFullSetupCheck && session.require2FAVerification) {
        res.status(403)
        res.json({message: "403.require-2fa-verification"})
        return
    }

    res.locals.actingUserContext = actingUserContext

    next()
}

// export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
//     // If an api key is present in the request, use api key validation
//     const apiKey = req.headers["x-api-key"]
//     if (apiKey && typeof(apiKey) === "string") {
//         try {
//             const verifiedKey = await auth.api.verifyApiKey({
//                 body: {
//                     key: apiKey
//                 }
//             })

//             if (!verifiedKey.valid || verifiedKey.error !== null ) {
//                 throw "403.no-such-credentials"
//             }

//             const session = await auth.api.getSession({headers: fromNodeHeaders(req.headers)})
//             if (!session) {
//                 throw "403.no-such-credentials"
//             }

//             res.locals.user = session.user
//             res.locals.session = session.session
//             res.locals.apiKey = verifiedKey.key

//             res.locals.actingUserContext = {
//                 user: session.user,
//                 session: session.session,
//                 apiKey: verifiedKey.key,
//                 requestHeaders: fromNodeHeaders(req.headers),
//             } as ActingUserContext

//             next()

//         } catch(err) {
//             res.status(403)
//             res.json({message: (err as Error)?.message || "403.no-such-credentials"})
//         }
//         return
//     }

//     try {
//         // Rotate the session if nessecary
//         const rotateSessionResult = await auth.api.tryRotateSession(
//             {headers: fromNodeHeaders(req.headers), returnHeaders: true}
//         )
       
//         if (rotateSessionResult.response.sessionRotated) {
//             const allSetCookies = rotateSessionResult.headers.getSetCookie().map((setCookie: string) => parseSetCookie(setCookie))
//             for (let {name, value, ...options} of allSetCookies) {
//                 res.cookie(name, value, options)
//             }
//             res.locals.headersForBetterAuth = new Headers()
//             res.locals.headersForBetterAuth.set("cookie", convertSetCookieToCookie(rotateSessionResult.headers))
//         } else {
//             res.locals.headersForBetterAuth = fromNodeHeaders(req.headers)
//         }
        
//         const getSessionResult = await auth.api.getSession({
//             headers: res.locals.headersForBetterAuth
//         })

//         if (getSessionResult === null) {
//             throw Error("403.no-such-credentials")
//         }

//         const {user, session} = getSessionResult
        
//         // Revoke deleted user's sessions
//         if (user._deleted) {
//             const deleteResult = await MongoClientDB.collection("session").deleteOne({token: session.token})
//             throw Error("403.no-such-credentials")
//         }
        
//         // Default to disallowing requests from not fully set up accounts
//         if (!res.locals.skipFullSetupCheck && !isAccountSetupStateComplete(user.accountSetupState as AccountSetupState | undefined)) {
//             throw Error("403.require-account-setup")
//         }

//         // Default to disallowing requests from unverified sessions
//         if (!res.locals.skipFullSetupCheck && session.require2FAVerification) {
//             throw Error("403.require-2fa-verification")
//         }

//         // Add session and user to the current response's context
//         res.locals.session = session
//         res.locals.user = user
//         res.locals.actingUserContext = {
//             user: user,
//             session: session,
//             apiKey: undefined,
//             requestHeaders: res.locals.headersForBetterAuth
//         } as ActingUserContext

//         next()

//     }
//     catch (err) {
//         res.status(403)
//         res.json({message: (err as Error)?.message || "403.no-such-credentials"})
//     }
// }

export async function authenticateMobileSession(req: Request, res: Response) {
    const mobileToken = req.headers["authorization"]?.replace("Bearer ", "")
    if (!mobileToken) {
        return null
    }

    try {
        const {response, headers} = await auth.api.mobileAuthGetSession({
            body: {token: mobileToken},
            returnHeaders: true
        }) as any

        // Save the session token for use by future betterauth calls
        const newHeaders = new Headers(headers)
        newHeaders.set("cookie", convertSetCookieToCookie(headers))

        return {
            user: response?.user,
            session: response?.session,
            apiKey: undefined,
            requestHeaders: newHeaders
        } as ActingUserContext

    } catch(err) {
        return null
    }
}


async function authenticateApiKey(req: Request, res: Response) {
    // Returns an ActingUserContext if a valid api key is included in the request, or null if one is not
    const apiKey = req.headers["x-api-key"]
    if (!apiKey || typeof(apiKey) !== "string") {
        return null
    }

    try {
        const verifiedKey = await auth.api.verifyApiKey({
            body: {
                key: apiKey
            }
        })

        if (!verifiedKey.valid || verifiedKey.error !== null ) {
            return null
        }

        const session = await auth.api.getSession({headers: fromNodeHeaders(req.headers)})

        if (!session) {
            return null
        }

        return {
            user: session.user,
            session: session.session,
            apiKey: verifiedKey.key,
            requestHeaders: fromNodeHeaders(req.headers)
        } as ActingUserContext
    } catch(err) {
        return null
    }
}

async function authenticateSessionCookie(req: Request, res: Response) {
    // Returns an ActingUserContext if a valid session cookie is included or null if not
    // Also handles rotating the participant session 
    let newBetterAuthHeaders = new Headers()
    try {
        const rotateSessionResult = await auth.api.tryRotateSession(
            {headers: fromNodeHeaders(req.headers), returnHeaders: true}
        )
        if (rotateSessionResult.response.sessionRotated) {
            const allSetCookies = rotateSessionResult.headers.getSetCookie().map((setCookie: string) => parseSetCookie(setCookie))
            for (let {name, value, ...options} of allSetCookies) {
                res.cookie(name, value, options)
            }
            newBetterAuthHeaders.set("cookie", convertSetCookieToCookie(rotateSessionResult.headers))
        } else {
            newBetterAuthHeaders = fromNodeHeaders(req.headers)
        }
    } catch(err) {
        console.log(err)
    }

    try {
        const getSessionResult = await auth.api.getSession({
            headers: newBetterAuthHeaders,
        })
        
        if (getSessionResult === null) {
            return null
        }
        
        const {user, session} = getSessionResult
        return {
            user: getSessionResult.user,
            session: getSessionResult.session,
            apiKey: undefined,
            requestHeaders: newBetterAuthHeaders,
        } as ActingUserContext

    } catch(err) {
        console.log(">>> err", err)
        return null
    }
}