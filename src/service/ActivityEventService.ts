import { Request, Response, Router } from "express"
import { ActivityEvent } from "../model/ActivityEvent"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"
import { Repository } from "../repository/Bootstrap"
// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export const ActivityEventService = Router()
ActivityEventService.post("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ActivityEventRepository = repo.getActivityEventRepository()
    let timestamp = new Date().getTime()
    let participant_id = req.params.participant_id
    const activity_event = req.body
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = {
      data: await ActivityEventRepository._insert(
        participant_id,
        Array.isArray(activity_event) ? activity_event : [activity_event]
      ),
    }

    //publishing data for activity_event add api((Token will be created in PubSubAPIListenerQueue consumer, as request is assumed as array and token should be created individually)
    PubSubAPIListenerQueue.add({
      topic: `activity_event`,
      action: "create",
      timestamp: timestamp,
      participant_id: participant_id,
      payload: Array.isArray(activity_event) ? activity_event : [activity_event],
    })

    PubSubAPIListenerQueue.add({
      topic: `participant.*.activity_event`,
      action: "create",
      timestamp: timestamp,
      participant_id: participant_id,
      payload: Array.isArray(activity_event) ? activity_event : [activity_event],
    })

    PubSubAPIListenerQueue.add({
      topic: `activity.*.activity_event`,
      action: "create",
      timestamp: timestamp,
      participant_id: participant_id,
      payload: Array.isArray(activity_event) ? activity_event : [activity_event],
    })

    PubSubAPIListenerQueue.add({
      topic: `participant.*.activity.*.activity_event`,
      action: "create",
      timestamp: timestamp,
      participant_id: participant_id,
      payload: Array.isArray(activity_event) ? activity_event : [activity_event],
    })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityEventService.get("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ActivityEventRepository = repo.getActivityEventRepository()
    let participant_id = req.params.participant_id
    const origin: string = req.query.origin
    const from: number | undefined = Number.parse(req.query.from)
    const to: number | undefined = Number.parse(req.query.to)
    const limit = Math.min(Math.max(Number.parse(req.query.limit) ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await ActivityEventRepository._select(participant_id, origin, from, to, limit) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
// TODO: activity/* and sensor/* entry
