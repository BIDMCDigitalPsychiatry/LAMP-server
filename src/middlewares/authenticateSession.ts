import { NextFunction, Request, Response } from "express";
import { auth, convertSetCookieToCookie } from "../utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClientDB } from "../repository/Bootstrap";
import { parseSetCookie } from "cookie";

// Session authentication middleware
// If the request comes from an authenticated user add the session to the request context
// If the request does not come from an authenticated user, return an unauthenticated response instead
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
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
        
        // Add session and user to the current response's context
        res.locals.session = session
        res.locals.user = user
        next()

    }
    catch (err) {
        res.status(403)
        res.json({message: "403.no-such-credentials"})
    }
}

