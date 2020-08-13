import { Request, Response, Router } from "express"
import { Activity } from "../model/Activity"
import { ActivityRepository } from "../repository/ActivityRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const ActivityService = Router()

ActivityService.post("/study/:study_id/activity", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/study/{study_id}/activity"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Activity
    request_schema.components = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
        DurationIntervalLegacy: api_schema.components.schemas.DurationIntervalLegacy,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    const activity = req.body
    let study_id = req.params.study_id
    Object.assign(activity, { study_id: study_id })
    var validate_request = ajv.validate(request_schema, activity)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    const output = { data: await ActivityRepository._insert(study_id, activity) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.put("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/activity/{activity_id}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Activity
    request_schema.components = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
        DurationIntervalLegacy: api_schema.components.schemas.DurationIntervalLegacy,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let activity_id = req.params.activity_id
    const activity = req.body
    Object.assign(activity, { activity_id: activity_id })
    var validate_request = ajv.validate(request_schema, activity)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    activity_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], activity_id)
    const output = { data: await ActivityRepository._update(activity_id, activity) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.delete("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/activity/{activity_id}"].delete.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = {
      type: "object",
      properties: req_properties,
    }
    let component_schema = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    request_schema.components = component_schema
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    let activity_id = req.params.activity_id
    let req_data = { activity_id: activity_id }
    var validate_request = ajv.validate(request_schema, req_data)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    activity_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], activity_id)
    const output = { data: await ActivityRepository._delete(activity_id) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.get("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/activity/{activity_id}"].get.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = {
      type: "object",
      properties: req_properties,
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    let component_schema = {
      schemas: {
        Timestamp: api_schema.components.schemas.Timestamp,
        Identifier: api_schema.components.schemas.Identifier,
        DurationIntervalLegacy: api_schema.components.schemas.DurationIntervalLegacy,
      },
    }
    request_schema.components = component_schema
    let activity_id = req.params.activity_id
    let req_data = { activity_id: activity_id, transform: req.query.transform }
    var validate_request = ajv.validate(request_schema, req_data)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    activity_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], activity_id)
    let output = { data: await ActivityRepository._select(activity_id) }
    let activity_schema = api_schema.components.schemas.Activity
    let response_schema: any = {
      type: "array",
      items: activity_schema,
    }
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
ActivityService.get("/participant/:participant_id/activity", async (req: Request, res: Response) => {
  try {    
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await ActivityRepository._select(participant_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.get("/study/:study_id/activity", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: await ActivityRepository._select(study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.get("/researcher/:researcher_id/activity", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: await ActivityRepository._select(researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.get("/activity", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), ["parent"])
    let output = { data: await ActivityRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
