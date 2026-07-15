import { Request, Response, Router } from "express"
import { _authorize } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"
const { sensorValidationRules } = require("../validator/validationRules")

const { validateRequest } = require("../middlewares/validateRequest")

export class SensorSpecService {
  public static _name = "SensorSpec"
  public static Router = Router()

  public static async list(actingUser: Session["user"], parent_id: null, ignore_binary?: boolean) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _authorize(actingUser, ["self", "sibling", "parent"])
    return await SensorSpecRepository._select(parent_id, ignore_binary)
  }

  public static async create(actingUser: Session["user"], parent_id: null, sensor_spec: any) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _authorize(actingUser, [])
    return await SensorSpecRepository._insert(sensor_spec)
  }

  public static async get(actingUser: Session["user"], sensor_spec_id: string) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _authorize(actingUser, ["self", "sibling", "parent"])
    return await SensorSpecRepository._select(sensor_spec_id)
  }

  public static async set(actingUser: Session["user"], sensor_spec_id: string, sensor_spec: any | null) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _authorize(actingUser, [])
    if (sensor_spec === null) {
      return await SensorSpecRepository._delete(sensor_spec_id)
    } else {
      return await SensorSpecRepository._update(sensor_spec_id, sensor_spec)
    }
  }
}

SensorSpecService.Router.post(
  "/sensor_spec",
  authenticateSession,
  sensorValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await SensorSpecService.create(res.locals.user, null, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorSpecService.Router.put(
  "/sensor_spec/:sensor_spec_name",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await SensorSpecService.set(res.locals.user, req.params.sensor_spec_name, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorSpecService.Router.delete(
  "/sensor_spec/:sensor_spec_name",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await SensorSpecService.set(res.locals.user, req.params.sensor_spec_name, null) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorSpecService.Router.get(
  "/sensor_spec/:sensor_spec_name",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await SensorSpecService.get(res.locals.user, req.params.sensor_spec_name) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorSpecService.Router.get("/sensor_spec", authenticateSession, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await SensorSpecService.list(res.locals.user, null) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
