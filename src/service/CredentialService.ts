import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository } from "../repository/Bootstrap"

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
}

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  async (req: Request, res: Response) => {
    try {
      let output = {
        data: await CredentialService.list(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.post(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential/`),
  async (req: Request, res: Response) => {
    try {
      res.json({
        data: await CredentialService.create(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.body
        ),
      })
    } catch (e) {
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
    try {
      res.json({
        data: await CredentialService.set(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          req.body
        ),
      })
    } catch (e) {
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
    try {
      res.json({
        data: await CredentialService.set(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          null
        ),
      })
    } catch (e) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
