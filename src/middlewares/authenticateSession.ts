import { NextFunction, Request, Response } from "express";
import { auth, convertSetCookieToCookie, Session } from "../utils/auth";
import { isAccountSetupStateComplete } from "../utils/accountSecurityUtilities";
import { AccountSetupState } from "../utils/accountSecurityUtilities";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClientDB } from "../repository/Bootstrap";

export type ActingUserContext = {
  user: Session["user"];
  session: Session["session"];
  apiKey?: any;
  requestHeaders: any;
};

export enum AuthFlag {
    allowMobileToken = "ALLOW_MOBILE_TOKEN",        // Route may use a mobile auth token
    skipFullSetupCheck = "SKIP_FULL_SETUP_CHECK",   // Route does not require oauth/2fa
    disallowCookie = "DISALLOW_COOKIE",             // Route ignores session cookie 
}

export type AuthRouteOptions = {
    [AuthFlag.allowMobileToken]?: boolean,
    [AuthFlag.skipFullSetupCheck]?: boolean,
    [AuthFlag.disallowCookie]?: boolean,
}

// Note: Api key use is currently controlled at authorization level (_authorize function)
//       in the future we should likely move that here
export function configureAuth(flags: AuthFlag[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        res.locals.authRouteOptions = Object.fromEntries(flags.map(f => ([f, true])))
        next()
    }
}

// Session authentication middleware
// If the request comes from an authenticated user add the session to the request context
// If the request does not come from an authenticated user, return an unauthenticated response instead
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
    const options = res.locals.authRouteOptions || {}
    let actingUserContext = undefined
    // If mobile auth is allowed, try authenticating with a mobile token
    if (options[AuthFlag.allowMobileToken]) {
        actingUserContext = await authenticateMobileSession(req, res)
    }

    // If the user is not authenticated try api key auth
    if (!actingUserContext) {
        actingUserContext = await authenticateApiKey(req, res)
    }

    // Otherwise, try authenticating with a session cookie
    if (!options[AuthFlag.disallowCookie] && !actingUserContext) {
        actingUserContext = await authenticateSessionCookie(req, res)
    }

    // If we have not found an ActingUserContext, throw
    if (!actingUserContext) {
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
    if (!options[AuthFlag.skipFullSetupCheck] && 
        !isAccountSetupStateComplete(user.accountSetupState as AccountSetupState | undefined)) {
        res.status(403)
        res.json({message: "403.require-account-setup"})
        return
    }

    // Default to disallowing requests from unverified sessions
    if (!options[AuthFlag.skipFullSetupCheck] && session.require2FAVerification) {
        res.status(403)
        res.json({message: "403.require-2fa-verification"})
        return
    }

    res.locals.actingUserContext = actingUserContext

    next()
}

export async function authenticateMobileSession(req: Request, res: Response) {
    // Returns an ActingUserContext if a valid mobile auth access key is included in the request, or null if not
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
    // Returns an ActingUserContext if a valid session cookie is included
    let newBetterAuthHeaders = fromNodeHeaders(req.headers)

    try {
        const getSessionResult = await auth.api.getSession({
            headers: newBetterAuthHeaders,
        })
        
        if (getSessionResult === null) {
            return null
        }
        
        const {user, session} = getSessionResult
        return {
            user: user,
            session: session,
            apiKey: undefined,
            requestHeaders: newBetterAuthHeaders,
        } as ActingUserContext

    } catch(err) {
        return null
    }
}