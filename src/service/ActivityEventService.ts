import { Request, Response, Router } from "express"
import { ActivityEvent } from "../model/ActivityEvent"
import { ActivityEventRepository } from "../repository/ActivityEventRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"; 

export const ActivityEventService = Router()

ActivityEventService.post("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let request_schema: any = api_schema.components.schemas.ActivityEvent
    request_schema.components = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    const activity_event = req.body
    var validate_request = ajv.validate(request_schema, activity_event)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    } 
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ActivityEventRepository._insert(participant_id, ae2re(req, [activity_event])) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityEventService.delete("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {    
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/participant/{participant_id}/activity_event"].get.parameters
    let req_properties: any = {}
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
    })
    let request_schema: any = {
      type: "array",
      items: { type: "object", properties: req_properties },
    }
    let component_schema = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    request_schema.components = component_schema
    let participant_id = req.params.participant_id
    let req_data = [
      {
        participant_id: participant_id,
        from: isNaN(req.query.from) ? req.query.from : parseInt(req.query.from),
        origin: req.query.origin,
        to: isNaN(req.query.to) ? req.query.to : parseInt(req.query.to),
        transform: req.query.transform,
      },
    ]
    var validate_request = ajv.validate(request_schema, req_data)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ActivityEventRepository._delete(participant_id, origin, from, to) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityEventService.get("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/participant/{participant_id}/activity_event"].get.parameters
    let req_properties: any = {}
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
    })
    let request_schema: any = {
      type: "array",
      items: { type: "object", properties: req_properties },
    }
    let component_schema = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    request_schema.components = component_schema
    let participant_id = req.params.participant_id
    let req_data = [
      {
        participant_id: participant_id,
        from: isNaN(req.query.from) ? req.query.from : parseInt(req.query.from),
        origin: req.query.origin,
        to: isNaN(req.query.to) ? req.query.to : parseInt(req.query.to),
        transform: req.query.transform,
      },
    ]
    var validate_request = ajv.validate(request_schema, req_data)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(participant_id, origin, from, to, limit)) }
    let activity_schema = api_schema.components.schemas.ActivityEvent
    let response_schema: any = {
      type: "array",
      items: activity_schema,
    }
    response_schema.items.properties.static_data = activity_schema.properties.data
    response_schema.components = component_schema
    var validate_response = ajv.validate(response_schema, output.data)
    if (!validate_response) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityEventService.get("/study/:study_id/activity_event", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(study_id, origin, from, to, limit)) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityEventService.get("/researcher/:researcher_id/activity_event", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(researcher_id, origin, from, to, limit)) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

//////////////////////
//   [DEPRECATED]   //
//////////////////////

const ae2re = (req: Request, e: any) => {
  if (req.path.endsWith("result_event"))
    // data: x.static_data, static_data: undefined,
    return e.map((x: any) => ({ ...x, temporal_slices: x.temporal_events, temporal_events: undefined }))
  return e
}
const re2ae = (req: Request, e: any) => {
  if (req.path.endsWith("result_event"))
    // static_data: x.data, data: undefined,
    return e.map((x: any) => ({ ...x, temporal_events: x.temporal_slices, temporal_slices: undefined }))
  return e
}

export const ResultEventService = Router()
ResultEventService.post("/participant/:participant_id/result_event", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    const activity_event = req.body
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ActivityEventRepository._insert(participant_id, ae2re(req, [activity_event])[0]) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResultEventService.delete("/participant/:participant_id/result_event", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ActivityEventRepository._delete(participant_id, origin, from, to) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResultEventService.get("/participant/:participant_id/result_event", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(participant_id, origin, from, to, limit)) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResultEventService.get("/study/:study_id/result_event", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(study_id, origin, from, to, limit)) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResultEventService.get("/researcher/:researcher_id/result_event", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? 1000, -1000), 1000) // clamped to [-1000, 1000]
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: re2ae(req, await ActivityEventRepository._select(researcher_id, origin, from, to, limit)) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
