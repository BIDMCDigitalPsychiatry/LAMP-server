import { NextFunction, Request, Response } from "express";
import { auth } from "../utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClientDB } from "../repository/Bootstrap";

// Session authentication middleware
// If the request comes from an authenticated user add the session to the request context
// If the request does not come from an authenticated user, return an unauthenticated response instead
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
    try {
        const getSessionResult = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        })
        
        if (getSessionResult === null) {
            // TODO: Better error message + check code
            res.status(401)
            res.json({message: "403.no-such-credentials"})
            return
        }
        
        const {user, session} = getSessionResult
        
        // Revoke deleted user's sessions
        if (user._deleted) {
            console.log(MongoClientDB)
            const deleteResult = await MongoClientDB.collection("session").deleteOne({token: session.token})
            res.json({message: "403.no-such-credentials"})
            return
        }
        
        console.log(`>>> Session: ${user.email} (${session.token})`)

        // Add session and user to the current response's context
        res.locals.session = session
        res.locals.user = user
        next()
    }
    catch (err) { // TODO: handle elegantly!
        console.log("ERROR!", err)
    }
}