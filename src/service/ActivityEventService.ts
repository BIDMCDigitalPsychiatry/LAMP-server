import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class ActivityEventService {
  public static _name = "ActivityEvent"
  public static Router = Router()

  public static async list(
    auth: any,
    participant_id: string,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    return await ActivityEventRepository._select(participant_id, origin, from, to, limit)
  }

  public static async create(auth: any, participant_id: string, activity_events: any[]) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    let data = await ActivityEventRepository._insert(participant_id, activity_events)

    //publishing data for activity_event add api((Token will be created in PubSubAPIListenerQueue consumer, as request is assumed as array and token should be created individually)
    PubSubAPIListenerQueue?.add(
      {
        topic: `activity_event`,
        action: "create",
        timestamp: Date.now(),
        participant_id: participant_id,
        payload: activity_events,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )

    PubSubAPIListenerQueue?.add(
      {
        topic: `participant.*.activity_event`,
        action: "create",
        timestamp: Date.now(),
        participant_id: participant_id,
        payload: activity_events,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )

    PubSubAPIListenerQueue?.add(
      {
        topic: `activity.*.activity_event`,
        action: "create",
        timestamp: Date.now(),
        participant_id: participant_id,
        payload: activity_events,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )

    PubSubAPIListenerQueue?.add(
      {
        topic: `participant.*.activity.*.activity_event`,
        action: "create",
        timestamp: Date.now(),
        participant_id: participant_id,
        payload: activity_events,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }
}

ActivityEventService.Router.post("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    res.json({
      data: await ActivityEventService.create(
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
ActivityEventService.Router.get("/participant/:participant_id/activity_event", async (req: Request, res: Response) => {
  try {
    let output = {
      data: await ActivityEventService.list(
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
