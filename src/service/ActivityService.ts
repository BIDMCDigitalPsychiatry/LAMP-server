import { Request, Response, Router } from "express"
import { _verify } from "./Security"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { ObjectId } from "bson"
import { authenticateToken } from "../middlewares/authenticateToken"
const { activityValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"
import { recordStartTime } from "../middlewares/recordStartTime"

export class ActivityService {
  public static _name = "Activity"
  public static Router = Router()

  public static async list(auth: any, study_id: string, ignore_binary: boolean, sibling = false) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await ActivityRepository._select(study_id, true, ignore_binary)
  }

  public static async create(auth: any, study_id: string, activity: any) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], study_id)
    const data = await ActivityRepository._insert(study_id, activity)

    //publishing data for activity add api with token = study.{study_id}.activity.{_id}
    activity.study_id = study_id
    activity.action = "create"
    activity.activity_id = data
    activity.settings = undefined
    activity.schedule = undefined
    activity.photo = undefined
    activity.icon = undefined
    activity.category = undefined

    PubSubAPIListenerQueue?.add(
      {
        topic: `activity`,
        token: `study.${study_id}.activity.${data}`,
        payload: activity,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    PubSubAPIListenerQueue?.add(
      {
        topic: `study.*.activity`,
        token: `study.${study_id}.activity.${data}`,
        payload: activity,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }

  public static async get(auth: any, activity_id: string) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], activity_id)
    return await ActivityRepository._select(activity_id, false)
  }

  public static async set(auth: any, activity_id: string, activity: any | null) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], activity_id)

    if (activity === null) {
      const parent = (await TypeRepository._parent(activity_id)) as any
      const data = await ActivityRepository._delete(activity_id)

      //publishing data for participant delete api for the Token study.{study_id}.activity.{activity_id}
      if (parent !== undefined && parent !== "") {
        PubSubAPIListenerQueue?.add({
          topic: `study.*.activity`,
          token: `study.${parent["Study"]}.activity.${activity_id}`,
          payload: { action: "delete", activity_id: activity_id, study_id: parent["Study"] },
        })

        PubSubAPIListenerQueue?.add({
          topic: `activity.*`,
          token: `study.${parent["Study"]}.activity.${activity_id}`,
          payload: { action: "delete", activity_id: activity_id, study_id: parent["Study"] },
        })

        PubSubAPIListenerQueue?.add({
          topic: `activity`,
          token: `study.${parent["Study"]}.activity.${activity_id}`,
          payload: { action: "delete", activity_id: activity_id, study_id: parent["Study"] },
        })
      }
      return data
    } else {
      const data = await ActivityRepository._update(activity_id, activity)
      //publishing data for activity update api (Token will be created in PubSubAPIListenerQueue consumer, as study for this activity need to fetched to create token)
      if (PubSubAPIListenerQueue) {
        PubSubAPIListenerQueue.on("waiting", () => {
          console.log(`[Queue waiting] Job ID}`)
        })

        PubSubAPIListenerQueue.on("active", () => {
          console.log(`[Queue active] Processing job:`)
        })

        PubSubAPIListenerQueue.on("completed", () => {
          console.log(`[Queue completed] Job `)
        })

        PubSubAPIListenerQueue.on("failed", () => {
          console.error(`[Queue failed] Job ID`)
        })
      }
      activity.activity_id = activity_id
      activity.action = "update"
      activity.settings = undefined
      activity.schedule = undefined
      activity.photo = undefined

      const job = await PubSubAPIListenerQueue?.add({ topic: `activity.*`, payload: activity })

      PubSubAPIListenerQueue?.add({ topic: `activity`, payload: activity })

      PubSubAPIListenerQueue?.add({ topic: `study.*.activity`, payload: activity })
      return data
    }
  }
}

ActivityService.Router.post(
  "/study/:study_id/activity",
  recordStartTime,
  authenticateToken,
  activityValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await ActivityService.create(req.get("Authorization"), req.params.study_id, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.study_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activity",
            object_id: data,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.study_id)
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
            object_type: "activity",
            object_id: "req.params.study_id",
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
ActivityService.Router.put(
  "/activity/:activity_id",
  recordStartTime,
  authenticateToken,
  // activityValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await ActivityService.set(req.get("Authorization"), req.params.activity_id, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.activity_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activity",
            object_id: req.params.activity_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.activity_id)
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
            object_type: "activity",
            object_id: req.params.activity_id,
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
ActivityService.Router.delete(
  "/activity/:activity_id",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await ActivityService.set(req.get("Authorization"), req.params.activity_id, null)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.activity_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "activity",
            object_id: req.params.activity_id,
            read_only: false,
            fields_changed: { deleted: true },
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.activity_id)
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
            object_type: "activity",
            object_id: req.params.activity_id,
            read_only: false,
            fields_changed: { deleted: true },
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
ActivityService.Router.get(
  "/activity/:activity_id",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ActivityService.get(req.get("Authorization"), req.params.activity_id) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.activity_id
          )
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "activity",
            object_id: req.params.activity_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.activity_id)
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
            object_type: "activity",
            object_id: req.params.activity_id,
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
ActivityService.Router.get(
  "/participant/:participant_id/activity",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityService.list(
          req.get("Authorization"),
          req.params.participant_id,
          req.query.ignore_binary === "true",
          true
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
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
            object_type: "activity",
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
            object_type: "activity",
            object_id: req.params.participant_id,
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
ActivityService.Router.get(
  "/study/:study_id/activity",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityService.list(
          req.get("Authorization"),
          req.params.study_id,
          req.query.ignore_binary === "true"
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.study_id
          )
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "activity",
            object_id: req.params.study_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.study_id)
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
            object_type: "activity",
            object_id: req.params.study_id,
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
