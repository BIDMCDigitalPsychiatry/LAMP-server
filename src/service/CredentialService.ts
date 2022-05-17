import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { TypeService } from "./TypeService"
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid"
import { OAuthConfiguration } from '../utils/OAuthConfiguration';
import fetch from "node-fetch"

export interface UpdateTokenResult {
  access_token?: string
  refresh_token?: string,
  success: boolean
}

export class CredentialService {
  public static _name = "Credential"
  public static Router = Router()

  public static async list(auth: any, type_id: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    type_id = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._select(type_id)
  }

  public static async create(auth: any, type_id: string | null, credential: any) {
    const CredentialRepository = new Repository().getCredentialRepository()
    type_id = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._insert(type_id, credential)
  }

  public static async get(auth: any, type_id: string | null, access_key: string) {
    const CredentialRepository = new Repository().getCredentialRepository()
    type_id = await _verify(auth, ["self", "parent"], type_id)
    let all = await CredentialRepository._select(type_id)
    return all.filter((x) => x.access_key === access_key)
  }

  public static async set(auth: any, type_id: string | null, access_key: string, credential: any | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    type_id = await _verify(auth, ["self", "parent"], type_id)
    if (credential === null) {
      return await CredentialRepository._delete(type_id, access_key)
    } else {
      return await CredentialRepository._update(type_id, access_key, credential)
    }
  }

  public static async updateToken(access_key: string, refresh_token: string, secret_key?: string): Promise<UpdateTokenResult> {
    const secret = process.env.TOKEN_SECRET
    if (!secret) {
      return { success: false }
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const origin = await CredentialRepository._find(access_key, secret_key)
                  .catch(() => { "failed" })
    if (origin === "failed") return { success: false }

    await CredentialRepository._saveRefreshToken(access_key, refresh_token)

    const accessToken = sign({
      typ: "Bearer",
      id: access_key,
      origin: origin,
    }, secret, {
      expiresIn: "1 week",
      jwtid: uuidv4(),
    })
    const refreshToken = sign({
      typ: "Offline",
      sid: uuidv4(),
      id: access_key,
    }, secret, {
      jwtid: uuidv4(),
    })

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      success: true,
    }
  }

  public static async refreshToken(refreshToken: string): Promise<UpdateTokenResult> {
    const secret = process.env.TOKEN_SECRET
    if (!secret || !refreshToken) {
      return { success: false }
    }

    let payload: any
    try {
      payload = verify(refreshToken, secret)
    } catch {
      throw new Error("401.invalid-token")
    }

    if (!payload.id) {
      throw new Error("401.invalid-token")
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const currentRefreshToken = await CredentialRepository._getIdPRefreshToken(payload.id)
    const request = OAuthConfiguration.getRefreshTokenRequest(currentRefreshToken)
    const response = await fetch(request)

    if (!response.ok) {
      throw new Error("500.idp-refresh-token-error")
    }

    const newRefreshToken = (await response.json()).refresh_token
    return CredentialService.updateToken(payload.id, newRefreshToken)
  }
}

CredentialService.Router.post("/token", async (req: Request, res: Response) => {
  const { id, password, refresh_token, grant_type } = req.body
  let result

  if(grant_type === "refresh_token") {
    result = await CredentialService.refreshToken(refresh_token)
  } else {
    result = await CredentialService.updateToken(id, password)
  }

  if (!result.success) res.status(401)
  res.json(result)
})

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)    
    try {
      let output = {
        data: await CredentialService.list(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.post(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential/`),
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.create(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.body
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.put(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          req.body
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.delete(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          null
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
