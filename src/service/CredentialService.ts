import { Request, Response, Router } from "express"
import { Credential } from "../model/Credential"
import { CredentialRepository } from "../repository/CredentialRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const CredentialService = Router()
CredentialService.get("/type/:type_id/credential", async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    type_id = await _verify(req.get("Authorization"), ["self", "parent"], type_id)
    let output = { data: await CredentialRepository._select(type_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
CredentialService.post("/type/:type_id/credential", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/type/{type_id}/credential"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Credential
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let type_id = req.params.type_id
    const credential = req.body
    Object.assign(credential, { type_id: type_id })
    var validate_request = ajv.validate(request_schema, credential)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    type_id = await _verify(req.get("Authorization"), ["self", "parent"], type_id)
    const output = { data: await CredentialRepository._insert(type_id, credential) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
CredentialService.put("/type/:type_id/credential/:access_key", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/type/{type_id}/credential/{access_key}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Credential
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let type_id = req.params.type_id
    const access_key = req.params.access_key
    const credential = req.body
    Object.assign(credential, { type_id: type_id, access_key: access_key })
    var validate_request = ajv.validate(request_schema, credential)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    type_id = await _verify(req.get("Authorization"), ["self", "parent"], type_id)
    const output = { data: await CredentialRepository._update(type_id, access_key, credential) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
CredentialService.delete("/type/:type_id/credential/:access_key", async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    const access_key = req.params.access_key
    type_id = await _verify(req.get("Authorization"), ["self", "parent"], type_id)
    const output = { data: await CredentialRepository._delete(type_id, access_key) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
