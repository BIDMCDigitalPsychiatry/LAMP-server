import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { findPermission } from "./Security"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { ObjectId } from "bson"
const { credentialValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { authenticateToken } from "../middlewares/authenticateToken"

export class CredentialService {
  public static _name = "Credential"
  public static Router = Router()

  public static async list(auth: any, type_id: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._select(type_id)
  }

  public static async create(auth: any, type_id: string | null, credential: any) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._insert(type_id, credential)
  }

  public static async get(auth: any, type_id: string | null, access_key: string) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    let all = await CredentialRepository._select(type_id)
    return all.filter((x) => x.access_key === access_key)
  }

  public static async set(auth: any, type_id: string | null, access_key: string, credential: any | null) {
    // const minLength = 4
    // if (credential.secret_key < minLength) {
    //   throw new Error("password must not be less than")
    // }

    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)

    const credentialData = await MongoClientDB.collection("credential").findOne({
      _deleted: false,
      _id: new ObjectId(response.user_id),
    })

    const permissionValue = await findPermission(credentialData.access_key)

    if (
      permissionValue === "admin" ||
      credentialData.access_key === access_key ||
      credentialData.access_key === "admin"
    ) {
      if (credential === null) {
        return await CredentialRepository._delete(type_id, access_key)
      } else {
        return await CredentialRepository._update(type_id, access_key, credential)
      }
    } else {
      throw new Error("403.security-context-out-of-scope")
    }
  }

  public static async verify(accessKey: string | null, secretKey: string) {
    const CredentialRepository = new Repository().getCredentialRepository()

    console.log("request ", accessKey, " &secret key ", secretKey)
    const res = await CredentialRepository._login(accessKey, secretKey)
    return res
  }

  public static async renewToken(refreshToken: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const res = await CredentialRepository._renewToken(refreshToken)
    return res
  }
  public static async logOut(token: string | undefined) {
    if (token) {
      const CredentialRepository = new Repository().getCredentialRepository()
      const res = await CredentialRepository._logout(token.split(" ")[1])
    } else {
      throw new Error("please provide authorization")
    }
  }

  public static async publicKey() {
    const fs = require("fs")
    const publicKey = fs.readFileSync("./public_key.pem", "utf8")
    return publicKey
  }
}

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await CredentialService.list(
          // req.get("Authorization"),
          req.cookies?.accessToken,
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.post(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential/`),
  authenticateToken,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)

    try {
      res.json({
        data: await CredentialService.create(
          // req.get("Authorization"),
          req.cookies?.accessToken,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.body
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.put(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  authenticateToken,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          req.cookies?.accessToken,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          req.body
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.delete(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          req.cookies?.accessToken,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          null
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.post(`/login`, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    // res.json({
    const data = await CredentialService.verify(
      // req.get("Authorization"),
      // req.params.type_id === "null" ? null : req.params.type_id,
      req.body.accessKey,
      req.body.secretKey
    )
    // })

    res.cookie("accessToken", data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000,
    })
    res.cookie("refreshToken", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({ data })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({
      data: await CredentialService.logOut(req.cookies?.accessToken),
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.post(`/renewToken`, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    const data = await CredentialService.renewToken(req.cookies?.refreshToken)
    res.cookie("accessToken", data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 30, // 15 minutes
    })
    res.cookie("refreshToken", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    res.json(data)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.get("/publicKey", async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)

  try {
    const publicKey = await CredentialService.publicKey()
    res.json(publicKey)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
