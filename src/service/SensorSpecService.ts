import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"
import { recordStartTime } from "../middlewares/recordStartTime"
const { sensorValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { ObjectId } from "bson"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"

export class SensorSpecService {
  public static _name = "SensorSpec"
  public static Router = Router()

  public static async list(auth: any, parent_id: null, ignore_binary?: boolean) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _verify(auth, ["self", "sibling", "parent"])
    return await SensorSpecRepository._select(parent_id, ignore_binary)
  }

  public static async create(auth: any, parent_id: null, sensor_spec: any) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _verify(auth, [])
    return await SensorSpecRepository._insert(sensor_spec)
  }

  public static async get(auth: any, sensor_spec_id: string) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _verify(auth, ["self", "sibling", "parent"])
    return await SensorSpecRepository._select(sensor_spec_id)
  }

  public static async set(auth: any, sensor_spec_id: string, sensor_spec: any | null) {
    const SensorSpecRepository = new Repository().getSensorSpecRepository()
    const _ = await _verify(auth, [])
    if (sensor_spec === null) {
      return await SensorSpecRepository._delete(sensor_spec_id)
    } else {
      return await SensorSpecRepository._update(sensor_spec_id, sensor_spec)
    }
  }
}

SensorSpecService.Router.post(
  "/sensor_spec",
  recordStartTime,
  authenticateToken,
  sensorValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorSpecService.create(req.get("Authorization"), null, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), [])

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorspec",
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
            authSubject = await _verify(req.get("Authorization"), [])
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
            object_type: "sensorspec",
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
SensorSpecService.Router.put(
  "/sensor_spec/:sensor_spec_name",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorSpecService.set(req.get("Authorization"), req.params.sensor_spec_name, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), [])

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
            authSubject = await _verify(req.get("Authorization"), [])
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
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
SensorSpecService.Router.delete(
  "/sensor_spec/:sensor_spec_name",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorSpecService.set(req.get("Authorization"), req.params.sensor_spec_name, null)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), [])

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
            authSubject = await _verify(req.get("Authorization"), [])
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
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
SensorSpecService.Router.get(
  "/sensor_spec/:sensor_spec_name",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await SensorSpecService.get(req.get("Authorization"), req.params.sensor_spec_name) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
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
            object_type: "sensorspec",
            object_id: req.params.sensor_spec_name,
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
SensorSpecService.Router.get(
  "/sensor_spec",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await SensorSpecService.list(req.get("Authorization"), null) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensorspec",
            object_id: "list", // Special ID for list operations
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"])
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
            object_type: "sensorspec",
            object_id: "list",
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
