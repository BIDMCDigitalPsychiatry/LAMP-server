import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
const { activitySpecValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { authenticateToken } from "../middlewares/authenticateToken"

export class ActivitySpecService {
  public static _name = "ActivitySpec"
  public static Router = Router()

  public static async list(auth: any, parent_id: null, ignore_binary?: boolean) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _verify(auth, ["self", "sibling", "parent"])
    return await ActivitySpecRepository._select(parent_id, ignore_binary)
  }

  public static async create(auth: any, parent_id: null, activity_spec: any) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _verify(auth, [])
    return await ActivitySpecRepository._insert(activity_spec)
  }

  public static async get(auth: any, activity_spec_id: string) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _verify(auth, ["self", "sibling", "parent"])
    return await ActivitySpecRepository._select(activity_spec_id)
  }

  public static async set(auth: any, activity_spec_id: string, activity_spec: any | null) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _verify(auth, [])
    if (activity_spec === null) {
      return await ActivitySpecRepository._delete(activity_spec_id)
    } else {
      return await ActivitySpecRepository._update(activity_spec_id, activity_spec)
    }
  }
}

ActivitySpecService.Router.post(
  "/activity_spec",
  authenticateToken,
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivitySpecService.create(req.get("Authorization"), null, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.put(
  "/activity_spec/:activity_spec_name",
  authenticateToken,
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await ActivitySpecService.set(req.get("Authorization"), req.params.activity_spec_name, req.body),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.delete(
  "/activity_spec/:activity_spec_name",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivitySpecService.set(req.get("Authorization"), req.params.activity_spec_name, null) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.get(
  "/activity_spec/:activity_spec_name",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ActivitySpecService.get(req.get("Authorization"), req.params.activity_spec_name) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.get("/activity_spec", authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await ActivitySpecService.list(req.get("Authorization"), null) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
