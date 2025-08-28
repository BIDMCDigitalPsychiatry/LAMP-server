import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { BulkDataWrite, publishSensorEvent } from "../utils/queue/BulkDataWrite"
import { authenticateToken } from "../middlewares/authenticateToken"
import { ObjectId } from "bson"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"
import { recordStartTime } from "../middlewares/recordStartTime"
// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export class SensorEventService {
  public static _name = "SensorEvent"
  public static Router = Router()

  public static async list(
    auth: any,
    id: string,
    ignore_binary: boolean | undefined,
    origin: string | undefined,
    from: number | undefined,
    to: number | undefined,
    limit: number | undefined
  ) {
    const SensorEventRepository = new Repository().getSensorEventRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], id)
    limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
    return await SensorEventRepository._select(id, ignore_binary, origin, from, to, limit)
  }

  public static async create(auth: any, id: string, sensor_events: any[]): Promise<string> {
    const SensorEventRepository = new Repository().getSensorEventRepository()

    const response: any = await _verify(auth, ["self", "sibling", "parent"], id)
    let data: any
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
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorEventService.create(
        req.get("Authorization"),
        req.params.participant_id,
        Array.isArray(req.body) ? req.body : [req.body]
      )
      const responseTime = Date.now() - startTime
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
            object_type: "sensorevent",
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
            object_type: "sensorevent",
            object_id: req.params.participant_id,
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
      console.log("Failure Msg On sensor events post", e.message)
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
SensorEventService.Router.get(
  "/participant/:participant_id/sensor_event",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorEventService.list(
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
            object_type: "sensorevent",
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
            object_type: "sensorevent",
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
SensorEventService.Router.post(
  "/researcher/:researcher_id/sensor_event",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorEventService.create(
        req.get("Authorization"),
        req.params.researcher_id,
        Array.isArray(req.body) ? req.body : [req.body]
      )
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.researcher_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorevent",
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
            object_type: "sensorevent",
            object_id: req.params.researcher_id,
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
      console.log("Failure Msg On sensor events post", e.message)
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

SensorEventService.Router.get(
  "/researcher/:researcher_id/sensor_event",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorEventService.list(
          req.get("Authorization"),
          req.params.researcher_id,
          (req.params as any).ignore_binary as boolean,
          req.query.origin as string,
          Number.parse((req.query as any).from),
          Number.parse((req.query as any).to),
          Number.parse((req.query as any).limit)
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)

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
            object_type: "sensorevent",
            object_id: req.params.researcher_id,
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
            object_type: "sensorevent",
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
