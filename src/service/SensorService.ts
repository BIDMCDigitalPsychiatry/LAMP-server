import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"
import { recordStartTime } from "../middlewares/recordStartTime"
const { sensorValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { ObjectId } from "bson"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"

export class SensorService {
  public static _name = "Sensor"
  public static Router = Router()

  public static async list(auth: any, study_id: string, ignore_binary: boolean, sibling: boolean = false) {
    const SensorRepository = new Repository().getSensorRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await SensorRepository._select(study_id, true, ignore_binary)
  }

  public static async create(auth: any, study_id: string, sensor: any) {
    const SensorRepository = new Repository().getSensorRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], study_id)
    const data = await SensorRepository._insert(study_id, sensor)

    //publishing data for sensor add api with token = study.{study_id}.sensor.{_id}
    sensor.study_id = study_id
    sensor.action = "create"
    sensor.settings = undefined
    sensor.sensor_id = data
    PubSubAPIListenerQueue?.add(
      {
        topic: `sensor`,
        token: `study.${study_id}.sensor.${data}`,
        payload: sensor,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    PubSubAPIListenerQueue?.add(
      {
        topic: `study.*.sensor`,
        token: `study.${study_id}.sensor.${data}`,
        payload: sensor,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }

  public static async get(auth: any, sensor_id: string) {
    const SensorRepository = new Repository().getSensorRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
    return await SensorRepository._select(sensor_id, false)
  }

  public static async set(auth: any, sensor_id: string, sensor: any | null) {
    const SensorRepository = new Repository().getSensorRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
    if (sensor === null) {
      //find the study id before delete, as it cannot be fetched after delete
      const parent = (await TypeRepository._parent(sensor_id)) as any
      const data = await SensorRepository._delete(sensor_id)

      //publishing data for participant delete api for the Token study.{study_id}.sensor.{sensor_id}
      if (parent !== undefined && parent !== "") {
        PubSubAPIListenerQueue?.add(
          {
            topic: `study.*.sensor`,
            token: `study.${parent["Study"]}.sensor.${sensor_id}`,
            payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
        PubSubAPIListenerQueue?.add(
          {
            topic: `sensor.*`,
            token: `study.${parent["Study"]}.sensor.${sensor_id}`,
            payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
        PubSubAPIListenerQueue?.add(
          {
            topic: `sensor`,
            token: `study.${parent["Study"]}.sensor.${sensor_id}`,
            payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
      }
      return data
    } else {
      const data = await SensorRepository._update(sensor_id, sensor)

      //publishing data for sensor update api (Token will be created in PubSubAPIListenerQueue? consumer, as study for this sensor need to fetched to create token)
      sensor.sensor_id = sensor_id
      sensor.action = "update"
      sensor.settings = undefined
      PubSubAPIListenerQueue?.add(
        { topic: `sensor.*`, payload: sensor },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        { topic: `sensor`, payload: sensor },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        { topic: `study.*.sensor`, payload: sensor },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      return data
    }
  }
}

SensorService.Router.post(
  "/study/:study_id/sensor",
  recordStartTime,
  authenticateToken,
  sensorValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorService.create(req.get("Authorization"), req.params.study_id, req.body)
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
            object_type: "sensor",
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
            object_type: "sensor",
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
SensorService.Router.put(
  "/sensor/:sensor_id",
  recordStartTime,
  sensorValidationRules(),
  validateRequest,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    try {
      const data = await SensorService.set(req.get("Authorization"), req.params.sensor_id, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.sensor_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.sensor_id)
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
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
SensorService.Router.delete(
  "/sensor/:sensor_id",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await SensorService.set(req.get("Authorization"), req.params.sensor_id, null)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.sensor_id
          )

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.sensor_id)
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
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
SensorService.Router.get(
  "/sensor/:sensor_id",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await SensorService.get(req.get("Authorization"), req.params.sensor_id) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(
            req.get("Authorization"),
            ["self", "sibling", "parent"],
            req.params.sensor_id
          )
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], req.params.sensor_id)
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
            object_type: "sensor",
            object_id: req.params.sensor_id,
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
SensorService.Router.get(
  "/participant/:participant_id/sensor",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorService.list(
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
            object_type: "sensor",
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
            object_type: "sensor",
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
SensorService.Router.get(
  "/study/:study_id/sensor",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await SensorService.list(
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
            object_type: "sensor",
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
            object_type: "sensor",
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
