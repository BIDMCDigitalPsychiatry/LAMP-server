import { NextFunction, Request, Response } from "express";
import { auth, convertSetCookieToCookie } from "../utils/auth";
import { isAccountSetupStateComplete } from "../utils/accountSecurityUtilities";
import { AccountSetupState } from "../utils/accountSecurityUtilities";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClientDB } from "../repository/Bootstrap";
import { parseSetCookie } from "cookie";


// By default authentication fails if the account is not fully set up
// To enable an end point for accounts with incomplete set up add skipFullSetupCheck
// to the middleware chain right before authenticateSession
export function skipFullSetupCheck(req: Request, res: Response, next: NextFunction) {
    res.locals.skipFullSetupCheck = true
    next()
}

// Session authentication middleware
// If the request comes from an authenticated user add the session to the request context
// If the request does not come from an authenticated user, return an unauthenticated response instead
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
    // If an api key is present in the request, use api key validation
    const apiKey = req.headers["x-api-key"]
    if (apiKey && typeof(apiKey) === "string") {
        try {
            const verifiedKey = await auth.api.verifyApiKey({
                body: {
                    key: apiKey
                }
            })

            if (!verifiedKey.valid || verifiedKey.error !== null ) {
                throw "403.no-such-credentials"
            }

            const session = await auth.api.getSession({headers: fromNodeHeaders(req.headers)})
            if (!session) {
                throw "403.no-such-credentials"
            }

            res.locals.user = session.user
            res.locals.session = session.session
            res.locals.apiKey = verifiedKey
            next()

        } catch(err) {
            res.status(403)
            res.json({message: (err as Error)?.message || "403.no-such-credentials"})
        }
        return
    }

    try {
        // Rotate the session if nessecary
        const rotateSessionResult = await auth.api.tryRotateSession(
            {headers: fromNodeHeaders(req.headers), returnHeaders: true}
        )
       
        if (rotateSessionResult.response.sessionRotated) {
            const allSetCookies = rotateSessionResult.headers.getSetCookie().map((setCookie: string) => parseSetCookie(setCookie))
            for (let {name, value, ...options} of allSetCookies) {
                res.cookie(name, value, options)
            }
            res.locals.headersForBetterAuth = new Headers()
            res.locals.headersForBetterAuth.set("cookie", convertSetCookieToCookie(rotateSessionResult.headers))
        } else {
            res.locals.headersForBetterAuth = fromNodeHeaders(req.headers)
        }
        
        const getSessionResult = await auth.api.getSession({
            headers: res.locals.headersForBetterAuth
        })

        if (getSessionResult === null) {
            throw Error("403.no-such-credentials")
        }

        const {user, session} = getSessionResult
        
        // Revoke deleted user's sessions
        if (user._deleted) {
            const deleteResult = await MongoClientDB.collection("session").deleteOne({token: session.token})
            throw Error("403.no-such-credentials")
        }
        
        // Default to disallowing requests from not fully set up accounts
        if (!res.locals.skipFullSetupCheck && !isAccountSetupStateComplete(user.accountSetupState as AccountSetupState | undefined)) {
            throw Error("403.require-account-setup")
        }

        // Default to disallowing requests from unverified sessions
        if (!res.locals.skipFullSetupCheck && session.require2FAVerification) {
            throw Error("403.require-2fa-verification")
        }

        // Add session and user to the current response's context
        res.locals.session = session
        res.locals.user = user
        next()

    }
    catch (err) {
        res.status(403)
        res.json({message: (err as Error)?.message || "403.no-such-credentials"})
    }
}
