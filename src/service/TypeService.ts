import { Request, Response, Router } from "express"
import { DynamicAttachment } from "../model/Type"
import { TypeRepository } from "../repository/TypeRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { ApiSchemaLAMP, AjvValidator } from "../app"

export const TypeService = Router()
TypeService.get("/type/:type_id/parent", async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)
    let output = { data: await TypeRepository._parent(type_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.get("/type/:type_id/attachment/:attachment_key?/:index?", async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    const attachment_key = req.params.attachment_key
    const index = req.params.index
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)
    if (attachment_key !== undefined) {
      let obj = await TypeRepository._get("a", <string>type_id, attachment_key)

      // TODO: if obj undefined here, return null instead of throwing 404 error

      const sequenceObj = Array.isArray(obj) || typeof obj === "string"
      const shouldIndex =
        index !== undefined &&
        (typeof obj === "object" || (sequenceObj && (Number.parse(index) !== undefined || index === "length")))
      const realIndex = sequenceObj && (Number.parse(index) ?? 0) < 0 ? obj.length + Number.parse(index) : index
      if (index !== undefined && !shouldIndex) throw new Error("404.specified-index-not-found")
      else if (shouldIndex) obj = obj[realIndex]

      // TODO: parse & b64decode data-uri strings if Accept header matches

      const output = { data: obj !== undefined ? obj : null }
      res.json(output)
    } else {
      const output = {
        data: (<string[]>[]).concat(
          await TypeRepository._list("a", <string>type_id),
          (await TypeRepository._list("b", <string>type_id)).map((x) => "dynamic/" + x)
        ),
      }
      res.json(output)
    }
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.put("/type/:type_id/attachment/:attachment_key/:target", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/type/{type_id}/attachment/{attachment_key}/{target}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.Type
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
    const attachment_key = req.params.attachment_key
    const target = req.params.target
    const attachment_value = req.body
    Object.assign(attachment_value, { type_id: type_id, target: target, attachment_key: attachment_key })
    var validate_request = ajv.validate(request_schema, attachment_value)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)
    const output = {
      data: (await TypeRepository._set("a", target, <string>type_id, attachment_key, attachment_value))
        ? {}
        : null /* error */,
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.get("/type/:type_id/attachment/dynamic/:attachment_key", async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    const attachment_key = req.params.attachment_key
    const invoke_always = req.query.invoke_always
    const ignore_output = req.query.ignore_output
    const include_logs = req.query.include_logs
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)

    let result: any = {}
    if (!!invoke_always) {
      // If needed, invoke the attachment now.
      const attachment: DynamicAttachment = await TypeRepository._get("b", <string>type_id, attachment_key)
      result = await TypeRepository._invoke(attachment, {})
      await TypeRepository._set("a", attachment.to!, <string>attachment.from, attachment.key + "/output", result)
    } else {
      // Otherwise, return any cached result available.
      result = await TypeRepository._get("a", <string>type_id, attachment_key + "/output")
    }
    const output = {
      data:
        !!include_logs && !ignore_output
          ? result
          : {
              data: !ignore_output ? result.output : undefined,
              logs: !!include_logs ? result.logs : undefined,
            },
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.put("/type/:type_id/attachment/dynamic/:attachment_key/:target", async (req: Request, res: Response) => {
  try {
    let ajv = AjvValidator()
    let api_schema: any = await ApiSchemaLAMP()
    let api_params = api_schema.paths["/type/{type_id}/attachment/dynamic/{attachment_key}/{target}"].put.parameters
    let req_properties: any = {}
    let request_required: any = []
    api_params.forEach((element: any) => {
      req_properties[element.name] = element.schema
      if (element.required !== undefined) {
        request_required.push(element.name)
      }
    })
    let request_schema: any = api_schema.components.schemas.DynamicAttachment
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
    const attachment_key = req.params.attachment_key
    const target = req.params.target
    const attachment_value = req.body
    const invoke_once = req.query.invoke_once
    Object.assign(attachment_value, {
      type_id: type_id,
      target: target,
      attachment_key: attachment_key,
      invoke_once: invoke_once,
    })
    var validate_request = ajv.validate(request_schema, attachment_value)
    if (!validate_request) {
      res.status(500).json({ error: ajv.errorsText() })
    }
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)
    let result: any = null /* error */
    if (TypeRepository._set("b", target, <string>type_id, attachment_key, attachment_value)) {
      // If needed, invoke the attachment now.
      if (!!invoke_once) {
        TypeRepository._invoke(attachment_value, {}).then((y) => {
          TypeRepository._set("a", target, <string>type_id, attachment_key + "/output", y)
        })
      }
      result = {}
    }
    const output = { data: result }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
