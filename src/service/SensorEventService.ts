import { Request, Response, Router } from "express"
import { _authorize } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { BulkDataWrite, publishSensorEvent } from "../utils/queue/BulkDataWrite"
import { authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"
// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class SensorEventService {
  public static _name = "SensorEvent"
  public static Router = Router()

  public static async list(
    actingUser: Session["user"],
    id: string,
    ignore_binary: boolean | undefined,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const SensorEventRepository = new Repository().getSensorEventRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], id)
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    return await SensorEventRepository._select(id, ignore_binary, origin, from, to, limit)
  }

  public static async create(actingUser: Session["user"], id: string, sensor_events: any[]) {
    const SensorEventRepository = new Repository().getSensorEventRepository()

    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], id)
    let data = {}
    //check for the existance of cache size and redis host
    if (!!process.env.REDIS_HOST) {
      if (!!process.env.CACHE_SIZE) {
        if (Number(process.env.CACHE_SIZE) !== 0) BulkDataWrite("sensor_event", id, sensor_events)
        else {
          data = await SensorEventRepository._insert(id, sensor_events)
          publishSensorEvent(id, [sensor_events[sensor_events.length - 1]])
        }
      } else {
        data = await SensorEventRepository._insert(id, sensor_events)
        publishSensorEvent(id, [sensor_events[sensor_events.length - 1]])
      }
    } else data = await SensorEventRepository._insert(id, sensor_events)

    return data
  }
}

SensorEventService.Router.post(
  "/participant/:participant_id/sensor_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await SensorEventService.create(
          res.locals.user,
          req.params.participant_id,
          Array.isArray(req.body) ? req.body : [req.body]
        ),
      })
    } catch (e: any) {
      console.log("Failure Msg On sensor events post", e.message)
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorEventService.Router.get(
  "/participant/:participant_id/sensor_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorEventService.list(
          res.locals.user,
          req.params.participant_id,
          (req.params as any).ignore_binary as boolean,
          req.query.origin as string,
          Number.parse((req.query as any).from),
          Number.parse((req.query as any).to),
          Number.parse((req.query as any).limit)
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorEventService.Router.post(
  "/researcher/:researcher_id/sensor_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await SensorEventService.create(
          res.locals.user,
          req.params.researcher_id,
          Array.isArray(req.body) ? req.body : [req.body]
        ),
      })
    } catch (e: any) {
      console.log("Failure Msg On sensor events post", e.message)
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

SensorEventService.Router.get(
  "/researcher/:researcher_id/sensor_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorEventService.list(
          res.locals.user,
          req.params.researcher_id,
          (req.params as any).ignore_binary as boolean,
          req.query.origin as string,
          Number.parse((req.query as any).from),
          Number.parse((req.query as any).to),
          Number.parse((req.query as any).limit)
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

// TODO: activity/* and sensor/* entry
