import { Request, Response, Router } from "express"
import { SensorSpec } from "../model/SensorSpec"
import { SensorSpecRepository } from "../repository/SensorSpecRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const SensorSpecService = Router()
SensorSpecService.post("/sensor_spec", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/sensor_spec"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.SensorSpec
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    const sensor_spec = req.body
    var validate_request = ajv.validate(request_schema, sensor_spec)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    const output = { data: await SensorSpecRepository._insert(sensor_spec) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorSpecService.put("/sensor_spec/:sensor_spec_name", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/sensor_spec/{sensor_spec_name}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.SensorSpec
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    const sensor_spec_name = req.params.sensor_spec_name
    const sensor_spec = req.body
    Object.assign(sensor_spec, { sensor_spec_name: sensor_spec_name })
    var validate_request = ajv.validate(request_schema, sensor_spec)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    const output = { data: await SensorSpecRepository._update(sensor_spec_name, sensor_spec) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorSpecService.delete("/sensor_spec/:sensor_spec_name", async (req: Request, res: Response) => {
  try {
    const sensor_spec_name = req.params.sensor_spec_name
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    let output = { data: await SensorSpecRepository._delete(sensor_spec_name) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorSpecService.get("/sensor_spec/:sensor_spec_name", async (req: Request, res: Response) => {
  try {
    const sensor_spec_name = req.params.sensor_spec_name
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    let output = { data: await SensorSpecRepository._select(sensor_spec_name) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorSpecService.get("/sensor_spec", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
    let output = { data: await SensorSpecRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
