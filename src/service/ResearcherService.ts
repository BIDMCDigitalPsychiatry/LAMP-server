import { Request, Response, Router } from "express"
import { Researcher } from "../model/Researcher"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const ResearcherService = Router()
ResearcherService.post("/researcher", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/researcher"].post.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let schema_component = api_schema.components.schemas.Researcher
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
    const researcher = req.body
    var validate_request = ajv.validate(request_schema, researcher)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    const _ = await _verify(req.get("Authorization"), [])
    const output = { data: await ResearcherRepository._insert(researcher) }
    let response_schema = schema_component
    response_schema.components = request_schema.components
    let output_data = { id: output.data }
    var validate_response = ajv.validate(response_schema, output_data)
    if (!validate_response) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.put("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/researcher/{researcher_id}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Researcher
    request_schema.components = {
      schemas: {
        Identifier: api_schema.components.schemas.Identifier,
      },
    }
    if (request_required.length > 0) {
      request_schema.required = request_required
    }
    Object.assign(request_schema.properties, req_properties)
    let researcher_id = req.params.researcher_id
    const researcher = req.body
    Object.assign(researcher, { researcher_id: researcher_id })
    var validate_request = ajv.validate(request_schema, researcher)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    const output = { data: await ResearcherRepository._update(researcher_id, researcher) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.delete("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    const output = { data: await ResearcherRepository._delete(researcher_id) }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.get("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: await ResearcherRepository._select(researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.get("/researcher", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), [])
    let output = { data: await ResearcherRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
