import { Request, Response, Router } from "express"
import { _authorize, ApiKeyAccessLevels } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { ActingUserContext, authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"
const { activitySpecValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")

export class ActivitySpecService {
  public static _name = "ActivitySpec"
  public static Router = Router()

  public static async list(actingUserContext: ActingUserContext, parent_id: null, ignore_binary?: boolean) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _authorize(actingUserContext, ["self", "parent"], null, ApiKeyAccessLevels.RESEARCHER)
    return await ActivitySpecRepository._select(parent_id, ignore_binary)
  }

  public static async create(actingUserContext: ActingUserContext, parent_id: null, activity_spec: any) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _authorize(actingUserContext, [], null, ApiKeyAccessLevels.SYSTEM_ADMIN)
    return await ActivitySpecRepository._insert(activity_spec)
  }

  public static async get(actingUserContext: ActingUserContext, activity_spec_id: string) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _authorize(actingUserContext, ["self", "parent"], null, ApiKeyAccessLevels.RESEARCHER)
    return await ActivitySpecRepository._select(activity_spec_id)
  }

  public static async set(actingUserContext: ActingUserContext, activity_spec_id: string, activity_spec: any | null) {
    const ActivitySpecRepository = new Repository().getActivitySpecRepository()
    const _ = await _authorize(actingUserContext, [], null, ApiKeyAccessLevels.SYSTEM_ADMIN)
    if (activity_spec === null) {
      return await ActivitySpecRepository._delete(activity_spec_id)
    } else {
      return await ActivitySpecRepository._update(activity_spec_id, activity_spec)
    }
  }
}

ActivitySpecService.Router.post(
  "/activity_spec",
  authenticateSession,
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivitySpecService.create(res.locals.actingUserContext, null, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.put(
  "/activity_spec/:activity_spec_name",
  authenticateSession,
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await ActivitySpecService.set(res.locals.actingUserContext, req.params.activity_spec_name, req.body),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.delete(
  "/activity_spec/:activity_spec_name",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivitySpecService.set(res.locals.actingUserContext, req.params.activity_spec_name, null) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.get(
  "/activity_spec/:activity_spec_name",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ActivitySpecService.get(res.locals.actingUserContext, req.params.activity_spec_name) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivitySpecService.Router.get("/activity_spec", authenticateSession, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await ActivitySpecService.list(res.locals.actingUserContext, null) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
