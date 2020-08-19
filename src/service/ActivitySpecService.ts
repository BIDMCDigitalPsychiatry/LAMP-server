import { Request, Response, Router } from "express"
import { ActivitySpec } from "../model/ActivitySpec"
import { ActivitySpecRepository } from "../repository/ActivitySpecRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const ActivitySpecService = Router()
ActivitySpecService.post("/activity_spec", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let request_schema: any = api_schema.components.schemas.ActivitySpec
    const activity_spec = req.body
    var validate_request = ajv.validate(request_schema, activity_spec)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const _ = await _verify(req.get("Authorization"), [])
    const output = { data: await ActivitySpecRepository._insert(activity_spec) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivitySpecService.put("/activity_spec/:activity_spec_name", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/activity_spec/{activity_spec_name}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.ActivitySpec
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    Object.assign(request_schema.properties, req_properties)
    const activity_spec_name = req.params.activity_spec_name
    const activity_spec = req.body
    Object.assign(activity_spec, { activity_spec_name: activity_spec_name })
    var validate_request = ajv.validate(request_schema, activity_spec)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const _ = await _verify(req.get("Authorization"), [])
    const output = { data: await ActivitySpecRepository._update(activity_spec_name, activity_spec) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivitySpecService.delete("/activity_spec/:activity_spec_name", async (req: Request, res: Response) => {
  try {
    const activity_spec_name = req.params.activity_spec_name
    const _ = await _verify(req.get("Authorization"), [])
    const output = { data: await ActivitySpecRepository._delete(activity_spec_name) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivitySpecService.get("/activity_spec/:activity_spec_name", async (req: Request, res: Response) => {
  try {
    const activity_spec_name = req.params.activity_spec_name
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    let output = { data: await ActivitySpecRepository._select(activity_spec_name) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivitySpecService.get("/activity_spec", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    let output = { data: await ActivitySpecRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
