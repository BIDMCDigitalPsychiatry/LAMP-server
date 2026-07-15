import { Request, Response, Router } from "express"
import { _authorize } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class ActivityEventService {
  public static _name = "ActivityEvent"
  public static Router = Router()

  public static async list(
    actingUser: Session["user"],
    participant_id: string,
    ignore_binary: boolean | undefined,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], participant_id)
    return await ActivityEventRepository._select(participant_id, ignore_binary, origin, from, to, limit)
  }

  public static async create(actingUser: Session["user"], participant_id: string, activity_events: any[]) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], participant_id)
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

ActivityEventService.Router.post(
  "/participant/:participant_id/activity_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await ActivityEventService.create(
          res.locals.user,
          req.params.participant_id,
          Array.isArray(req.body) ? req.body : [req.body]
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityEventService.Router.get(
  "/participant/:participant_id/activity_event",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityEventService.list(
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
// TODO: activity/* and sensor/* entry
