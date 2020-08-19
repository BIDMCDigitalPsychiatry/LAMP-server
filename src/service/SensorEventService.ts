import { Request, Response, Router } from "express"
import { SensorEvent } from "../model/SensorEvent"
import { SensorEventRepository } from "../repository/SensorEventRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const SensorEventService = Router()
SensorEventService.post("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/participant/{participant_id}/sensor_event"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.SensorEvent
    request_schema.components = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let participant_id = req.params.participant_id
    const sensor_event = req.body
    Object.assign(sensor_event, { participant_id: participant_id })
    var validate_request = ajv.validate(request_schema, sensor_event)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = {
      data: await SensorEventRepository._insert(
        participant_id,
        Array.isArray(sensor_event) ? sensor_event : [sensor_event]
      ),
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.delete("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await SensorEventRepository._delete(participant_id, origin, from, to) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.get("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let participant_id: string = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await SensorEventRepository._select(participant_id, origin, from, to, limit) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.get("/study/:study_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: await SensorEventRepository._select(study_id, origin, from, to, limit) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.get("/researcher/:researcher_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: await SensorEventRepository._select(researcher_id, origin, from, to, limit) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
