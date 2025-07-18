import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"
import { ObjectId } from "bson"
import { recordStartTime } from "../middlewares/recordStartTime"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class ActivityEventService {
  public static _name = "ActivityEvent"
  public static Router = Router()

  public static async list(
    auth: any,
    participant_id: string,
    ignore_binary: boolean | undefined,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    const response: any = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    return await ActivityEventRepository._select(participant_id, ignore_binary, origin, from, to, limit)
  }

  public static async create(auth: any, participant_id: string, activity_events: any[]) {
    const ActivityEventRepository = new Repository().getActivityEventRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], participant_id)
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
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await ActivityEventService.create(
        req.get("Authorization"),
        req.params.participant_id,
        Array.isArray(req.body) ? req.body : [req.body]
      )

      const responseTime = startTime - Date.now()
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.participant_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activityevent",
            object_id: req.params.participant_id,
            read_only: false,
            fields_changed: req.body,
            access_by: credential.access_key, // The authenticated user's access key
            response_status: 200, // Success status
            response_time_ms: responseTime,
            ...extractAuditContext(req),
          })
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }
      })
    } catch (e: any) {
      const responseTime = Date.now() - startTime
      const statusCode = parseInt(e.message.split(".")[0]) || 500

      setImmediate(async () => {
        try {
          let authSubject
          try {
            authSubject = await _verify(
              req.get("Authorization"),
              ["self", "sibling", "parent"],
              req.params.participant_id
            )
          } catch (err) {
            authSubject = { _id: "" }
          }

          let credential
          try {
            const id = new ObjectId(authSubject._id)
            credential = await MongoClientDB.collection("credential").findOne({ _id: id })
          } catch (e) {
            credential = { access_key: "anonymous" }
          }

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activityevent",
            object_id: "unknown",
            read_only: false,
            fields_changed: req.body,
            access_by: credential.access_key,
            response_status: statusCode,
            response_time_ms: responseTime,
            ...extractAuditContext(req),
          })
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }
      })
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityEventService.Router.get(
  "/participant/:participant_id/activity_event",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityEventService.list(
          req.get("Authorization"),
          req.params.participant_id,
          (req.params as any).ignore_binary as boolean,
          req.query.origin as string,
          Number.parse((req.query as any).from),
          Number.parse((req.query as any).to),
          Number.parse((req.query as any).limit)
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = startTime - Date.now()
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.participant_id
          )
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "activityevent",
            object_id: req.params.participant_id,
            read_only: true,
            fields_changed: null,
            access_by: credential.access_key,
            response_status: 200,
            response_time_ms: responseTime,
            ...extractAuditContext(req),
          })
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }
      })
    } catch (e: any) {
      const responseTime = Date.now() - startTime
      const statusCode = parseInt(e.message.split(".")[0]) || 500

      setImmediate(async () => {
        try {
          let authSubject
          try {
            authSubject = await _verify(
              req.get("Authorization"),
              ["self", "sibling", "parent"],
              req.params.researcher_id
            )
          } catch (err) {
            authSubject = { _id: "" }
          }

          let credential
          try {
            const id = new ObjectId(authSubject._id)
            credential = await MongoClientDB.collection("credential").findOne({ _id: id })
          } catch (e) {
            credential = { access_key: "anonymous" }
          }

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activityevent",
            object_id: req.params.researcher_id,
            read_only: true,
            fields_changed: null,
            access_by: credential.access_key,
            response_status: statusCode,
            response_time_ms: responseTime,
            ...extractAuditContext(req),
          })
        } catch (auditError) {
          console.error("Audit logging failed:", auditError)
        }
      })
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
// TODO: activity/* and sensor/* entry
