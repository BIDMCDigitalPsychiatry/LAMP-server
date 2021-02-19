import { Request, Response, Router } from "express"
import { SensorEvent } from "../model/SensorEvent"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { SchedulerDeviceUpdateQueue } from "../utils/queue/SchedulerDeviceUpdateQueue"
import { Repository } from "../repository/Bootstrap"
// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export const SensorEventService = Router()
SensorEventService.post("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const SensorEventRepository = repo.getSensorEventRepository()
    let participant_id = req.params.participant_id
    const sensor_event = req.body
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = {
      data: await SensorEventRepository._insert(
        participant_id,
        Array.isArray(sensor_event) ? sensor_event : [sensor_event]
      ),
    }
    if (sensor_event.sensor === "lamp.analytics" && undefined !== sensor_event.data.device_token) {
      SchedulerDeviceUpdateQueue.add(
        {
          device_type: sensor_event.data.device_type,
          device_token: sensor_event.data.device_token,
          participant_id: participant_id,
          mode: 1,
        },
        { attempts: 3, backoff: 10, removeOnComplete: true, removeOnFail: true }
      )
    }
    if (sensor_event.sensor === "lamp.analytics" && sensor_event.data.action === "logout") {
      SchedulerDeviceUpdateQueue.add(
        { device_type: undefined, device_token: undefined, participant_id: participant_id, mode: 2 },
        { attempts: 3, backoff: 10, removeOnComplete: true, removeOnFail: true }
      )
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorEventService.get("/participant/:participant_id/sensor_event", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const SensorEventRepository = repo.getSensorEventRepository()
    let participant_id: string = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await SensorEventRepository._select(participant_id, origin, from, to, limit) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
// TODO: activity/* and sensor/* entry
