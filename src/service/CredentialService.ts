import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { findPermission } from "./Security"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { ObjectId } from "bson"
const { credentialValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { authenticateToken } from "../middlewares/authenticateToken"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"
import { recordStartTime } from "../middlewares/recordStartTime"

export class CredentialService {
  public static _name = "Credential"
  public static Router = Router()

  public static async list(auth: any, type_id: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._select(type_id)
  }

  public static async create(auth: any, type_id: string | null, credential: any) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    return await CredentialRepository._insert(type_id, credential)
  }

  public static async get(auth: any, type_id: string | null, access_key: string) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)
    let all = await CredentialRepository._select(type_id)
    return all.filter((x) => x.access_key === access_key)
  }

  public static async set(auth: any, type_id: string | null, access_key: string, credential: any | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _verify(auth, ["self", "parent"], type_id)

    const credentialData = await MongoClientDB.collection("credential").findOne({
      _deleted: false,
      _id: new ObjectId(response.user_id),
    })

    const permissionValue = await findPermission(credentialData.access_key)

    if (
      permissionValue === "admin" ||
      credentialData.access_key === access_key ||
      credentialData.access_key === "admin"
    ) {
      if (credential === null) {
        return await CredentialRepository._delete(type_id, access_key)
      } else {
        return await CredentialRepository._update(type_id, access_key, credential)
      }
    } else {
      throw new Error("403.security-context-out-of-scope")
    }
  }

  public static async verify(accessKey: string | null, secretKey: string) {
    const CredentialRepository = new Repository().getCredentialRepository()

    const res = await CredentialRepository._login(accessKey, secretKey)
    return res
  }

  public static async renewToken(refreshToken: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const res = await CredentialRepository._renewToken(refreshToken)
    return res
  }
  public static async logOut(token: string | undefined): Promise<string> {
    if (token) {
      const CredentialRepository = new Repository().getCredentialRepository()
      const res = await CredentialRepository._logout(token.split(" ")[1])
      return res
    } else {
      throw new Error("please provide authorization")
    }
  }
}

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await CredentialService.list(
          req.get("Authorization"),
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
            object_id: req.params.type_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)
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
            object_type: "credential",
            object_id: req.params.type_id,
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
CredentialService.Router.post(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential/`),
  recordStartTime,
  authenticateToken,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await CredentialService.create(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id,
        req.body
      )
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)
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
            object_type: "credential",
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
CredentialService.Router.put(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  recordStartTime,
  authenticateToken,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await CredentialService.set(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id,
        req.params.access_key,
        req.body
      )
      const responseTime = Date.now() - startTime

      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
            object_id: req.params.type_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)
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
            object_type: "credential",
            object_id: req.params.type_id,
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
CredentialService.Router.delete(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await CredentialService.set(
        req.get("Authorization"),
        req.params.type_id === "null" ? null : req.params.type_id,
        req.params.access_key,
        null
      )
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
            object_id: req.params.type_id,
            read_only: false,
            fields_changed: { deleted: true },
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.type_id)
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
            object_type: "credential",
            object_id: req.params.type_id,
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
CredentialService.Router.post(`/login`, recordStartTime, async (req: Request, res: Response) => {
  const startTime = (req as any).startTime
  res.header(ApiResponseHeaders)
  try {
    const data = await CredentialService.verify(req.body.accessKey, req.body.secretKey)
    const responseTime = Date.now() - startTime
    res.json({ data })
    setImmediate(async () => {
      try {
        logAuditEvent({
          timestamp: new Date(),
          object_type: "credential",
          object_id: data._id,
          read_only: false,
          fields_changed: null,
          access_by: "annonymous",
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
        logAuditEvent({
          timestamp: new Date(),
          object_type: "credential",
          object_id: "unknown",
          read_only: false,
          fields_changed: null,
          access_by: "anonymous",
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
})

CredentialService.Router.post("/logout", recordStartTime, authenticateToken, async (req: Request, res: Response) => {
  const startTime = (req as any).startTime
  res.header(ApiResponseHeaders)
  try {
    const data = await CredentialService.logOut(req.get("Authorization"))
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
          object_type: "credential",
          object_id: data,
          read_only: false,
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
          object_type: "credential",
          object_id: "unknown",
          read_only: false,
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
})

CredentialService.Router.post(
  `/renewToken`,
  recordStartTime,

  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await CredentialService.renewToken(req.body.refreshToken)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
            object_id: data._id,
            read_only: false,
            fields_changed: null,
            access_by: "anonymous",
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

      // Audit failed requests too
      setImmediate(async () => {
        try {
          logAuditEvent({
            timestamp: new Date(),
            object_type: "credential",
            object_id: "unknown",
            read_only: false,
            fields_changed: null,
            access_by: "anonymous",
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
