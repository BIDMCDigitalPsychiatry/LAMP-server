import { Router } from "express"
import { authenticateSession } from "../middlewares/authenticateSession"
import { auth, formatPrimaryKey } from "../utils/auth"
import { _authorize, ApiKeyAccessLevels } from "./Security"

export class ApiKeyService {
  public static _name = "ApiKey"
  public static Router = Router()

  public static async create(actingUserContext:any, credentialId:string, expiresOn:any, name: string) {
    // TODO: Implement names and expiry dates...
    await _authorize(actingUserContext, [], credentialId, ApiKeyAccessLevels.NONE)
    const apiKey = await auth.api.createApiKey({
        body: {
            userId: formatPrimaryKey(credentialId),
            rateLimitMax: 1000,
        }
    })
    return apiKey
  }

  public static async listByCredential(actingUserContext:any, credentialId:string) {
    await _authorize(actingUserContext, [], credentialId, ApiKeyAccessLevels.NONE)
    const apiKeys = await auth.api.getApiKeysByUser({
        query: {
            userId: credentialId
        },
        headers: actingUserContext.requestHeaders
    })
    return apiKeys
  }

  public static async delete(actingUserContext:any, apiKeyId: string) {
    // Todo: Pass the credential associated with apikeyId
    await _authorize(actingUserContext, [], null, ApiKeyAccessLevels.NONE)
    const data = await auth.api.deleteApiKey({
        body: {
            keyId: apiKeyId
        },
        headers: actingUserContext.requestHeaders,
    })
    return !!data?.success
  }

}

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
            const apiKey = await ApiKeyService.create(res.locals.actingUserContext, req.params.credentialId, "", "")
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
            const data = await ApiKeyService.delete(res.locals.actingUserContext, req.params.keyId)
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
            const apiKeys = await ApiKeyService.listByCredential(res.locals.actingUserContext, req.params.credentialId)
            res.json(apiKeys)
        } catch (e) {
            res.status(500)
            res.json({error: "500.not-implemented"})
        }
    }
)

