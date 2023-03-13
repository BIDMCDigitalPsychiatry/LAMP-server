import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { TypeService } from "./TypeService"
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid"
import { OAuthConfiguration } from '../utils/OAuthConfiguration';
import fetch from "node-fetch"
import { PersonalAccessToken } from "../model/PersonalAccessToken"

export interface UpdateTokenResult {
  access_token?: string
  refresh_token?: string,
  success: boolean
}

export interface PersonalAccessTokenResult {
  personal_access_token?: string
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
      console.log("[OAuth] (updateToken) Missing TOKEN_SECRET")
      return { success: false }
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const origin = await CredentialRepository._find(access_key, secret_key).catch(() => "failed" )
    if (origin === "failed") {
      console.log("[OAuth] (updateToken) Invalid (access_key, secret_key) pair")
      return { success: false }
    }

    console.log("[OAuth] (updateToken) About to save refresh token")
    try {
      await CredentialRepository._saveRefreshToken(access_key, refresh_token)
    } catch (error) {
      console.log(`[OAuth] (updateToken) Could not save refresh token: ${error}`)
      throw error
    }

    console.log("[OAuth] (updateToken) Refresh token successfully saved")

    const accessToken = sign({
      typ: "Bearer",
      id: access_key,
      type: "OAuthToken"
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

  public static async listTokens(auth: any, access_key: string): Promise<PersonalAccessToken[]> {
    const secret = process.env.TOKEN_SECRET
    if (!secret) {
      console.log("[OAuth] (createPersonalAccessToken) Missing TOKEN_SECRET")
      return []
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const origin = await CredentialRepository._find(access_key).catch(() => "failed" )
    if (origin === "failed") {
      console.log("[OAuth] (createPersonalAccessToken) Invalid access_key")
      return []
    }

    await _verify(auth, ["self", "parent"], origin)

    const tokens = await CredentialRepository._tokens(access_key).catch(() => "failed");
    if (typeof tokens === "string") {
      console.log("[OAuth] (revokePersonalAccessToken) Invalid access_key")
      return []
    }
    return tokens;
  }

  public static async createPersonalAccessToken(auth: any, access_key: string, expiry: number, description: string): Promise<string | null> {
    const secret = process.env.TOKEN_SECRET
    if (!secret) {
      console.log("[OAuth] (createPersonalAccessToken) Missing TOKEN_SECRET")
      return null;
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const origin = await CredentialRepository._find(access_key).catch(() => "failed" )
    if (origin === "failed") {
      console.log("[OAuth] (createPersonalAccessToken) Invalid access_key")
      return null;
    }

    await _verify(auth, ["self", "parent"], origin)

    const now = Date.now();
    if (expiry <= now) {
      console.log("[OAuth] (createPersonalAccessToken) Expiry date must be > now")
      return null;
    }
    const expiresInSeconds = Math.round((expiry - now)/1000);
    const accessToken = sign({
      typ: "Bearer",
      id: access_key,
      type: "PersonalAccessToken"
    }, secret, {
      expiresIn: expiresInSeconds,
      jwtid: uuidv4(),
    })

    const tokens = await CredentialRepository._tokens(access_key).catch(() => "failed");
    if (typeof tokens === "string") {
      console.log("[OAuth] (createPersonalAccessToken) Invalid access_key")
      return null;
    }
    tokens.push({token: accessToken, created: Date.now(), expiry, description});

    const result = await CredentialRepository._update(origin, access_key, {tokens}).catch(() => "failed");

    if (result === "failed") {
      console.log("[OAuth] (createPersonalAccessToken) Couldn't save the token")
      return null; 
    }
    return accessToken;
  }

  public static async revokePersonalAccessToken(auth: any, access_key: string, personal_access_token: string): Promise<{success: boolean}> {
    const secret = process.env.TOKEN_SECRET
    if (!secret) {
      console.log("[OAuth] (revokePersonalAccessToken) Missing TOKEN_SECRET")
      return { success: false }
    }

    const CredentialRepository = new Repository().getCredentialRepository()
    const origin = await CredentialRepository._find(access_key).catch(() => "failed" )
    if (origin === "failed") {
      console.log("[OAuth] (revokePersonalAccessToken) Invalid access_key")
      return { success: false }
    }

    await _verify(auth, ["self", "parent"], origin)

    const tokens = await CredentialRepository._tokens(access_key).catch(() => "failed");
    if (typeof tokens === "string") {
      console.log("[OAuth] (revokePersonalAccessToken) Invalid access_key")
      return { success: false }
    }
    const token = tokens.find(({token}) => token === personal_access_token);
    if (!token) {
      console.log("[OAuth] (revokePersonalAccessToken) Personal Access Token not found")
      return { success: false }
    }
    const newTokens = tokens.filter(({token}) => token !== personal_access_token);

    const result = await CredentialRepository._update(origin, access_key, {tokens: newTokens}).catch(() => "failed");
    return {
      success: result !== "failed",
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

CredentialService.Router.post(`/credential/:id/token`,
  async (req: Request, res: Response) => {
    const {expiry, description} = req.body
    res.header(ApiResponseHeaders)
    const access_key = req.params.id === "null" ? null : req.params.id;
    if (!access_key) {
      console.log("[OAuth] (createPersonalAccessToken) Missing Credential ID")
      res.status(400).json({ error: "Missing Credential ID" })
      return;
    }
    try {
      res.json({
        data: await CredentialService.createPersonalAccessToken(
          req.get("Authorization"),
          access_key,
          expiry,
          description
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

CredentialService.Router.get(`/credential/:id/token`,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    const access_key = req.params.id === "null" ? null : req.params.id;
    if (!access_key) {
      console.log("[OAuth] (createPersonalAccessToken) Missing Credential ID")
      res.status(400).json({ error: "Missing Credential ID" })
      return;
    }
    try {
      res.json({
        data: await CredentialService.listTokens(
          req.get("Authorization"),
          access_key,
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

CredentialService.Router.delete(`/credential/:id/token/:token`,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    const access_key = req.params.id === "null" ? null : req.params.id;
    if (!access_key) {
      console.log("[OAuth] (createPersonalAccessToken) Missing Credential ID")
      res.status(400).json({ error: "Missing Credential ID" })
      return;
    }
    const token = req.params.token === "null" ? null : req.params.token;
    if (!token) {
      console.log("[OAuth] (createPersonalAccessToken) Missing Token")
      res.status(400).json({ error: "Missing Token" })
      return;
    }
    try {
      res.json({
        data: await CredentialService.revokePersonalAccessToken(
          req.get("Authorization"),
          access_key,
          token,
        ),
      })
    } catch (e:any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

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
