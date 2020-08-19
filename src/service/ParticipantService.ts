import { Request, Response, Router } from "express"
import { Participant } from "../model/Participant"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const ParticipantService = Router()
ParticipantService.post("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/study/{study_id}/participant"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let schema_component = api_schema.components.schemas.Participant
    let request_schema: any = schema_component
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    const participant = req.body
    let study_id = req.params.study_id
    Object.assign(participant, { study_id: study_id })
    var validate_request = ajv.validate(request_schema, participant)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    const output = { data: await ParticipantRepository._insert(study_id, participant) }
    let response_schema = schema_component
    response_schema.components = request_schema.components
    delete response_schema.required
    var validate_response = ajv.validate(response_schema, output.data)
    if (!validate_response) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.put("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/participant/{participant_id}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Participant
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let participant_id = req.params.participant_id
    const participant = req.body
    Object.assign(participant, { participant_id: participant_id })
    var validate_request = ajv.validate(request_schema, participant)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ParticipantRepository._update(participant_id, participant) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.delete("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ParticipantRepository._delete(participant_id) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await ParticipantRepository._select(participant_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: await ParticipantRepository._select(study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/researcher/:researcher_id/participant", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: await ParticipantRepository._select(researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/participant", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), [])
    let output = { data: await ParticipantRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
