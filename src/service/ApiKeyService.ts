import { Router } from "express"
import { authenticateSession } from "../middlewares/authenticateSession"
import { auth, formatPrimaryKey } from "../utils/auth"
import { fromNodeHeaders } from "better-auth/node"
import { _authorize, ApiKeyAccessLevels } from "./Security"

export class ApiKeyService {
  public static _name = "ApiKey"
  public static Router = Router()
}

ApiKeyService.Router.get(
    "/api-key/sample",
    authenticateSession,
    async (req, res) => {
        console.log("res.locals: ", res.locals)
        res.json({message: "/api/sample called"})
    }
)

/**
 * Create api key
 */
ApiKeyService.Router.post(
    "/api-key/:credentialId",
    authenticateSession,
    async (req, res) => {
        /**
         * body should have: 
         *    userId
         *    api key name
         *    expiration date/leese time
         *    
         */
        try {
            await _authorize(res.locals.user, [], req.params.credentialId, ApiKeyAccessLevels.NONE)
            console.log("Authorized!")
            const apiKey = await auth.api.createApiKey({
                body: {
                    userId: formatPrimaryKey(req.params.credentialId),
                    rateLimitMax: 1000,
                }
            })
            res.json({
                key: apiKey.key
            })
        } catch(e) {
            console.log("EEEEE", e)
            res.status(500)
            res.json({error: "500.not-implemented"})
        }
    }
)

/** 
 * Delete api key
 */
ApiKeyService.Router.delete(
    "/api-key/:keyId",
    authenticateSession,
    async (req, res) => {
        try {
            // TODO: authObject should be owner of the api key
            await _authorize(res.locals.user, [], null, ApiKeyAccessLevels.NONE)
            const data = await auth.api.deleteApiKey({
                body: {
                    keyId: req.params.keyId
                },
                headers: fromNodeHeaders(req.headers)
            })
            res.json({message: "ok"})
        } catch(e) {
            res.status(500)
            res.json({error: "500.not-implemented"})
        }
    }
)

/** Get api key info (NOT key value) */
ApiKeyService.Router.get(
    "/api-key/:credentialId",
    authenticateSession,
    async (req, res) => {
        try {
            await _authorize(res.locals.user, [], req.params.credentialId, ApiKeyAccessLevels.NONE)
            const data = await auth.api.getApiKeysByUser({
                query: {
                    userId: req.params.credentialId
                },
                headers: fromNodeHeaders(req.headers)
            })
            res.json(data)
        } catch (e) {
            res.status(500)
            res.json({error: "500.not-implemented"})
        }
    }
)

