import { Request, Response, Router } from "express"
import { DynamicAttachment } from "../model/Type"
import { TypeRepository } from "../repository/TypeRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"

// In migrating from the legacy fixed /type/:id/... paths to the modern /:type/:id/ paths, 
// we need to compute all the paths up here once and use them later as arrays.
const _parent_routes = ["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/parent`)
const _get_routes = (<string[]>[]).concat(
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/attachment/:attachment_key?/:index?`),
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/tag/:attachment_key?/:index?`)
)
const _put_routes = (<string[]>[]).concat(
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/attachment/:attachment_key/:target`),
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/tag/:attachment_key/:target`)
)

export const TypeService = Router()
TypeService.get(_parent_routes, async (req: Request, res: Response) => {
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
TypeService.get(_get_routes, async (req: Request, res: Response) => {
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
      const output = { data: await TypeRepository._list("a", <string>type_id) }
      res.json(output)
    }
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.put(_put_routes, async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    const attachment_key = req.params.attachment_key
    const target = req.params.target
    const attachment_value = req.body
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
/*
TypeService.get(["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/attachment/dynamic/:attachment_key`), async (req: Request, res: Response) => {
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
TypeService.put(["researcher", "study", "participant", "activity", "sensor", "type"].map(type => `/${type}/:type_id/attachment/dynamic/:attachment_key/:target`), async (req: Request, res: Response) => {
  try {
    let type_id = req.params.type_id
    const attachment_key = req.params.attachment_key
    const target = req.params.target
    const attachment_value = req.body
    const invoke_once = req.query.invoke_once
    type_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], type_id)

    let result: any = null // error 
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
*/
