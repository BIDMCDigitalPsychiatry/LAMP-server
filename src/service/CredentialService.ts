import { Request, Response, Router } from "express"
import { _authorize, _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
const { credentialValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { authenticateToken } from "../middlewares/authenticateToken"
import { authenticateSession } from "../middlewares/authenticateSession"
import { auth, Session } from "../utils/auth"

export class CredentialService {
  public static _name = "Credential"
  public static Router = Router()

  public static async list(actingUser: Session["user"], type_id: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _authorize(actingUser, ["self", "parent"], type_id)
    return await CredentialRepository._select(type_id)
  }

  public static async create(actingUser: Session["user"], type_id: string | null, credential: any) {
    const CredentialRepository = new Repository().getCredentialRepository()
    await _authorize(actingUser, ["self", "parent"], type_id)
    return await CredentialRepository._insert(type_id, credential)
  }

  public static async get(auth: any, type_id: string | null, access_key: string) { // TODO : Finish updating with new auth when doing query api
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    let all = await CredentialRepository._select(type_id)
    return all.filter((x) => x.access_key === access_key)
  }

  public static async set(actingUser: Session["user"], type_id: string | null, access_key: string, credential: any | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response = await _authorize(actingUser, ["self", "parent"], type_id)

    if (credential === null) {
      return await CredentialRepository._delete(type_id, access_key)
    } else {
      return await CredentialRepository._update(type_id, access_key, credential)
    }
  }

  public static async verify(accessKey: string | null, secretKey: string) {
    const CredentialRepository = new Repository().getCredentialRepository()

    const res = await CredentialRepository._login(accessKey, secretKey)
    return res
  }

  public static async renewToken(refreshToken: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const res = await CredentialRepository._renewToken(refreshToken)
    return res
  }
  public static async logOut(session: Session["session"] | null) {
    if (session) {
      const CredentialRepository = new Repository().getCredentialRepository()
      const res = await CredentialRepository._logout(session.token)
    } else {
      throw new Error("please provide authorization") // TODO: Fix this error message
    }
  }
}

CredentialService.Router.get("/testVerify", authenticateSession, async (req, res) => {
  try {
    await _authorize(res.locals.user, [])
    res.json({message: "Am authorized"})
  } catch (err:any) {
    console.log(err.message)
    res.json({message: err.message})
  }
  const ResearcherRepository = new Repository().getResearcherRepository()
})

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await CredentialService.list(
          res.locals.user,
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
  authenticateSession,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)

    try {
      res.json({
        data: await CredentialService.create(
          res.locals.user,
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
  authenticateSession,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {

    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          res.locals.user,
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
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          res.locals.user,
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
    const verifyResult = await CredentialService.verify(req.body.accessKey, req.body.secretKey)

    // We must manually set the session cookie by copying the entire header value as the cookie is signed by better auth
    // This must be the first cookie added to the response
    res.setHeader("Set-Cookie", verifyResult.headers.get("set-cookie"));

    return res.json(verifyResult.response)  // TODO: Fine tune the desired response from this
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)  // TODO: Pull out these basic auth things
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.get(
  "/testAuth",
  authenticateSession,
  async (req, res) => {
    console.log("passed authenticate session")
    console.log("res.locals: ", res.locals)
    res.json({text: "nice work!", session: res.locals.session, user: res.locals.user})
  }
)


CredentialService.Router.post("/logout", authenticateSession, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({
      data: await CredentialService.logOut(res.locals.session),
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.post(`/renewToken`, authenticateToken, async (req: Request, res: Response) => {  // TODO: Remove this - will need to be added back to support mobile app
  res.header(ApiResponseHeaders)
  try {
    res.json({
      data: await CredentialService.renewToken(req.body.refreshToken),
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

