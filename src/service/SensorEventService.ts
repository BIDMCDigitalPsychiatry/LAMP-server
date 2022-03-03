import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository } from "../repository/Bootstrap"
import { BulkDataWrite } from "../utils/queue/BulkDataWrite"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { RedisClient } from "../repository/Bootstrap"
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
    let data = {}
    //check for the existance of cache size and redis host
    if (!!process.env.REDIS_HOST) {
      if (!!process.env.CACHE_SIZE) {
        if (Number(process.env.CACHE_SIZE) !== 0) BulkDataWrite("sensor_event", participant_id, sensor_events)
        else data = await SensorEventRepository._insert(participant_id, sensor_events)
      } else data = await SensorEventRepository._insert(participant_id, sensor_events)
    } else data = await SensorEventRepository._insert(participant_id, sensor_events)

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
    console.log("Failure Msg On sensor events post", e.message)
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
