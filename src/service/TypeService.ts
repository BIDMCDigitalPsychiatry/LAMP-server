import { Request, Response, Router } from "express"
import { DynamicAttachment } from "../model/Type"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { authenticateToken } from "../middlewares/authenticateToken"
import { validateInput } from "./Security"

export class TypeService {
  public static _name = "Type"
  public static Router = Router()

  public static async parent(auth: any, type_id: string | null) {
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], type_id)
    let data
    const isResearcher = response.id === response.origin;

    if ((response.id && !isResearcher) || type_id === "me") {
      data = await TypeRepository._parent(response.id || type_id);
    } else {
      data = await TypeRepository._parent(String(type_id));
    }

    // FIXME: THIS WILL TRIGGER A DELETE EVERY TIME A RESOURCE'S PARENT IS REQUESTED!
    /*
    //add the list of keys to get deleted
    try {
      await RedisClient?.del(`${type_id}_lookup:participants`)
      await RedisClient?.del(`${type_id}_lookup:activities`)
      await RedisClient?.del(`${type_id}_lookup:sensors`)
    } catch (error) { }
    */
    return data
  }

  public static async cordinator(type_id: string | null) {
    const TypeRepository = new Repository().getTypeRepository()
    const data = await TypeRepository._cordinator(type_id as any)

    return data
  }

  public static async list(auth: any, type_id: string | null) {
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], type_id)
    return await TypeRepository._list("a", <string>type_id)
  }

  public static async get(auth: any, type_id: string | null, attachment_key: string, index?: string) {
    const TypeRepository = new Repository().getTypeRepository()

    const response: any = await _verify(auth, ["self", "sibling", "parent"], type_id)
    let obj

    if (type_id !== undefined && type_id !== null && type_id !== "me") {
      obj = await TypeRepository._get("a", <string>type_id, attachment_key)
    } else {
      obj = await TypeRepository._get("a", <string>response.id, attachment_key)
    }

    // TODO: if obj undefined here, return null instead of throwing 404 error
    const sequenceObj = Array.isArray(obj) || typeof obj === "string"
    const shouldIndex =
      index !== undefined &&
      (typeof obj === "object" || (sequenceObj && (Number.parse(index) !== undefined || index === "length")))
    const realIndex = sequenceObj && (Number.parse(index) ?? 0) < 0 ? obj.length + Number.parse(index) : index
    if (index !== undefined && !shouldIndex) throw new Error("404.specified-index-not-found")
    else if (shouldIndex) obj = obj[realIndex]
    // TODO: parse & b64decode data-uri strings if Accept header matches
    return obj !== undefined ? obj : null
  }

  public static async set(
    auth: any,
    type_id: string | null,
    target: string,
    attachment_key: string,
    attachment_value: any
  ) {
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], type_id)
    if (attachment_key === "lamp.automation") {
      PubSubAPIListenerQueue?.add(
        {
          topic: attachment_key,
          token: attachment_key,
          payload: { researcher_id: type_id },
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
    }

    return await TypeRepository._set("a", target, <string>type_id, attachment_key, attachment_value)
  }
}

// In migrating from the legacy fixed /type/:id/... paths to the modern /:type/:id/ paths,
// we need to compute all the paths up here once and use them later as arrays.
const _parent_routes = ["researcher", "study", "participant", "activity", "sensor", "type"].map(
  (type) => `/${type}/:type_id/parent`
)
const _get_routes = (<string[]>[]).concat(
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/attachment/:attachment_key?/:index?`
  ),
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/tag/:attachment_key?/:index?`
  )
)
const _put_routes = (<string[]>[]).concat(
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/attachment/:attachment_key/:target`
  ),
  ...["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/tag/:attachment_key/:target`
  )
)
TypeService.Router.get("/:type_id/cordinators", authenticateToken, async (req: Request, res: Response) => {
  try {
    let output = {
      data: (await TypeService.parent(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id
      )) as any,
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    const cordinators = await TypeService.cordinator(output.data.Researcher)

    res.json({
      cordinators: cordinators,
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.Router.get(_parent_routes, authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = {
      data: await TypeService.parent(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id
      ),
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.Router.get(_get_routes, authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    if (req.params.attachment_key === undefined) {
      res.json({
        data: await TypeService.list(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      })
    } else {
      res.json({
        data: await TypeService.get(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.attachment_key,
          req.params.index
        ),
      })
    }
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
TypeService.Router.put(_put_routes, authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({
      data: (await TypeService.set(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id,
        req.params.target,
        req.params.attachment_key,
        req.body
      ))
        ? {}
        : null /* error */,
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
