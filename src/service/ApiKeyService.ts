import { Request, Response, Router } from "express"
import { authenticateSession } from "../middlewares/authenticateSession"
import { auth, formatPrimaryKey } from "../utils/auth"
import { _authorize, ApiKeyAccessLevels } from "./Security"
import { body, checkSchema, validationResult } from "express-validator"

export class ApiKeyService {
  public static _name = "ApiKey"
  public static Router = Router()

  public static async create(actingUserContext:any, credentialId:string, expiresIn: number | null, name: string) {
    await _authorize(actingUserContext, [], credentialId, ApiKeyAccessLevels.NONE)

    const createBody: any = {
        userId: formatPrimaryKey(credentialId),
        rateLimitMax: 1000,
        name: name,
    }

    if (!!expiresIn) {
        createBody.expiresIn = expiresIn
    }

    const apiKey = await auth.api.createApiKey({
        body: createBody
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

    try {
        const result:any = await auth.api.adminDeleteApiKey({
            body: {
                keyId: apiKeyId
            },
            headers: actingUserContext.requestHeaders,
        })
        return !!result?.success
    } catch(e) {
        return false
    }
  }

}

/**
 * Create api key
 */
ApiKeyService.Router.post(
    "/api-key/:credentialId",
    authenticateSession,
    body("name").trim().notEmpty(),
    body("expiresOn").isISO8601().toDate().optional(),
    async (req: Request, res: Response) => {

        // Validate post data
        try {
            validationResult(req).throw()
            if (req.body.expiresOn?.valueOf() <= Date.now()) {
                throw "400.invalid-parameters"
            }
        } catch (e: any) {
            res.status(400)
            res.json({error: "400.invalid-parameters"})
            return
        }

        try {
            const apiKey = await ApiKeyService.create(
                res.locals.actingUserContext,
                req.params.credentialId,
                !!req.body.expiresOn ? (req.body.expiresOn.valueOf() - Date.now()) / 1000 : null,
                req.body.name,
            )
            res.json({
                key: apiKey.key
            })
        } catch(e) {
            res.status(500)
            res.json({error: "500.ApiKey-creation-failed"})
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
            const data = await ApiKeyService.delete(res.locals.actingUserContext, req.params.keyId)
            if (data) {
                res.json({message: "ok"})
            } else {
                throw "500.deletion-failed"
            }
        } catch(e) {
            res.status(500)
            res.json({error: "500.deletion-failed"})
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
            res.json({error: "500.list-failed"})
        }
    }
)

