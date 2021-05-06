import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { SchedulerDeviceUpdateQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"
import { BulkDataWrite } from "../utils/queue/BulkDataWrite"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class SensorEventService {
  public static _name = "SensorEvent"
  public static Router = Router()

  public static async list(
    auth: any,
    participant_id: string,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const SensorEventRepository = new Repository().getSensorEventRepository()
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    return await SensorEventRepository._select(participant_id, origin, from, to, limit)
  }

  public static async create(auth: any, participant_id: string, sensor_events: any[]) {
    const SensorEventRepository = new Repository().getSensorEventRepository()
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    let data: {} = {}
    //If Redis is configured, use cache to insert the bulk
    if (!!process.env.REDIS_HOST) {
      BulkDataWrite("sensor_event", participant_id, sensor_events)
    } else {
      data = await SensorEventRepository._insert(participant_id, sensor_events)
    }

    for (let event of sensor_events) {
      if (event.sensor === "lamp.analytics" && undefined !== event.data.device_token) {
        SchedulerDeviceUpdateQueue?.add(
          {
            device_type: event.data.device_type,
            device_token: event.data.device_token,
            participant_id: participant_id,
            mode: 1,
          },
          { attempts: 3, backoff: 10, removeOnComplete: true, removeOnFail: true }
        )
      }
      if (event.sensor === "lamp.analytics" && event.data.action === "logout") {
        SchedulerDeviceUpdateQueue?.add(
          { device_type: undefined, device_token: undefined, participant_id: participant_id, mode: 2 },
          { attempts: 3, backoff: 10, removeOnComplete: true, removeOnFail: true }
        )
      }
    }
    return data
  }
}

SensorEventService.Router.post("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    res.json({
      data: await SensorEventService.create(
        req.get("Authorization"),
        req.params.participant_id,
        Array.isArray(req.body) ? req.body : [req.body]
      ),
    })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.Router.get("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    let output = {
      data: await SensorEventService.list(
        req.get("Authorization"),
        req.params.participant_id,
        req.query.origin as string,
        Number.parse((req.query as any).from),
        Number.parse((req.query as any).to),
        Number.parse((req.query as any).limit)
      ),
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
// TODO: activity/* and sensor/* entry
