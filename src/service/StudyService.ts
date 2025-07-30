import e, { Request, response, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"
import { recordStartTime } from "../middlewares/recordStartTime"
const { inputValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { ObjectId } from "bson"
import { logAuditEvent, extractAuditContext } from "../utils/AuditLogger"

export class StudyService {
  public static _name = "Study"
  public static Router = Router()

  public static async list(auth: any, researcher_id: string) {
    const StudyRepository = new Repository().getStudyRepository()
    const response: any = await _verify(auth, ["self", "parent"], researcher_id)
    return await StudyRepository._select(researcher_id, true)
  }

  public static async create(auth: any, researcher_id: string, study: any) {
    const StudyRepository = new Repository().getStudyRepository()

    const response: any = await _verify(auth, ["self", "parent"], researcher_id)
    const data = await StudyRepository._insert(researcher_id, study)

    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    study.researcher_id = researcher_id
    study.study_id = data
    study.action = "create"
    PubSubAPIListenerQueue?.add(
      {
        topic: `study`,
        token: `researcher.${researcher_id}.study.${data}`,
        payload: study,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    PubSubAPIListenerQueue?.add(
      {
        topic: `researcher.*.study`,
        token: `researcher.${researcher_id}.study.${data}`,
        payload: study,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }

  public static async get(auth: any, study_id: string) {
    const StudyRepository = new Repository().getStudyRepository()
    const response: any = await _verify(auth, ["self", "parent"], study_id)
    return await StudyRepository._select(study_id)
  }

  public static async set(auth: any, study_id: string, study: any | null) {
    const StudyRepository = new Repository().getStudyRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _verify(auth, ["self", "parent"], study_id)
    if (study === null) {
      let parent = (await TypeRepository._parent(study_id)) as any
      const data = await StudyRepository._delete(study_id)

      //publishing data for study delete api with Token researcher.{researcher_id}.study.{study_id}
      PubSubAPIListenerQueue?.add(
        {
          topic: `study.*`,
          token: `researcher.${parent["Researcher"]}.study.${study_id}`,
          payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        {
          topic: `study`,
          token: `researcher.${parent["Researcher"]}.study.${study_id}`,
          payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        {
          topic: `researcher.*.study`,
          token: `researcher.${parent["Researcher"]}.study.${study_id}`,
          payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      return data
    } else {
      const data = await StudyRepository._update(study_id, study)

      //publishing data for study update api(Token will be created in PubSubAPIListenerQueue consumer, as researcher for this study need to fetched to create token)
      study.study_id = study_id
      study.action = "update"
      PubSubAPIListenerQueue?.add(
        { topic: `study.*`, payload: study },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        { topic: `study`, payload: study },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        { topic: `researcher.*.study`, payload: study },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      return data
    }
  }
}

StudyService.Router.post(
  "/researcher/:researcher_id/study",
  recordStartTime,
  authenticateToken,
  inputValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await StudyService.create(req.get("Authorization"), req.params.researcher_id, req.body)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.researcher_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "study",
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.researcher_id)
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
            object_id: "req.params.researcher_id",
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
StudyService.Router.put("/study/:study_id", recordStartTime, authenticateToken, async (req: Request, res: Response) => {
  const startTime = (req as any).startTime
  res.header(ApiResponseHeaders)
  try {
    const data = await StudyService.set(req.get("Authorization"), req.params.study_id, req.body)
    const responseTime = Date.now() - startTime
    res.json({ data })
    setImmediate(async () => {
      try {
        const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)

        const credential = await MongoClientDB.collection("credential").findOne({
          _id: new ObjectId(authSubject._id),
        })

        logAuditEvent({
          timestamp: new Date(),
          object_type: "study",
          object_id: req.params.study_id,
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
          object_type: "study",
          object_id: req.params.study_id,
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
})
StudyService.Router.delete(
  "/study/:study_id",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const data = await StudyService.set(req.get("Authorization"), req.params.study_id, null)
      const responseTime = Date.now() - startTime
      res.json({ data })
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "study",
            object_id: req.params.study_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)
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
            object_type: "study",
            object_id: req.params.study_id,
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
StudyService.Router.get("/study/:study_id", recordStartTime, authenticateToken, async (req: Request, res: Response) => {
  const startTime = (req as any).startTime
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await StudyService.get(req.get("Authorization"), req.params.study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    const responseTime = Date.now() - startTime
    res.json(output)
    setImmediate(async () => {
      try {
        const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)
        const credential = await MongoClientDB.collection("credential").findOne({
          _id: new ObjectId(authSubject._id),
        })
        logAuditEvent({
          timestamp: new Date(),
          object_type: "study",
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
          authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)
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
          object_type: "study",
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
})
StudyService.Router.get(
  "/researcher/:researcher_id/study",
  recordStartTime,
  authenticateToken,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await StudyService.list(req.get("Authorization"), req.params.researcher_id) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      const responseTime = Date.now() - startTime
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.researcher_id)
          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })
          logAuditEvent({
            timestamp: new Date(),
            object_type: "study",
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.researcher_id)
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
            object_type: "study",
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

// Clone study id to another-import activities,sensors to new studyid given
StudyService.Router.post(
  "/researcher/:researcher_id/study/clone",
  recordStartTime,
  authenticateToken,
  inputValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    const startTime = (req as any).startTime
    res.header(ApiResponseHeaders)
    try {
      const StudyRepository = new Repository().getStudyRepository()
      const ActivityRepository = new Repository().getActivityRepository()
      const TypeRepository = new Repository().getTypeRepository()
      const SensorRepository = new Repository().getSensorRepository()
      const ParticipantRepository = new Repository().getParticipantRepository()
      let researcher_id = req.params.researcher_id
      const study = req.body
      const response: any = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
      const output = { data: await StudyRepository._insert(researcher_id, study) }
      const responseTime = Date.now() - startTime
      let should_add_participant: boolean = req.body.should_add_participant ?? false
      let StudyID: string | undefined =
        req.body.study_id === "" || req.body.study_id === "null" ? undefined : req.body.study_id
      if (!!StudyID) {
        let activities = await ActivityRepository._select(StudyID, true)
        let sensors = await SensorRepository._lookup(StudyID, true)
        let GrpActivities = new Array()
        let ClonedActivities = new Array()

        for (let activity of activities) {
          //process group activities later
          if (activity.spec === "lamp.group") {
            GrpActivities.push(activity)
            continue
          }
          try {
            let object: any = {
              name: activity.name,
              spec: activity.spec,
              settings: activity.settings,
              schedule: activity.schedule,
              category: activity.category ?? null,
            }
            const res = await ActivityRepository._insert(output["data"], object)
            object.id = activity.id
            object.cloneId = res
            await ClonedActivities.push(object)
            try {
              let attachment_key = "lamp.dashboard.survey_description"
              if (activity.spec !== "lamp.survey") attachment_key = "lamp.dashboard.activity_details"
              const tags = await TypeRepository._get("a", <string>activity.id, attachment_key)
              await TypeRepository._get("a", <string>activity.id, attachment_key)
              await TypeRepository._set("a", "me", <string>res, attachment_key, tags)
            } catch (error) {}

            PubSubAPIListenerQueue?.add({
              topic: `activity`,
              token: `study.${output["data"]}.activity.${res}`,
              payload: { action: "create", activity_id: res, study_id: output["data"] },
            })
          } catch (error) {
            console.log("error clone1", error)
          }
        }
        let NewGroupActivities = new Array()
        if (GrpActivities.length) {
          for (const GrpActivity of GrpActivities) {
            let settings = new Array()
            for (const ClonedActivity of ClonedActivities) {
              for (const groupMapId of GrpActivity.settings) {
                if (groupMapId === ClonedActivity.id) {
                  await settings.push(ClonedActivity.cloneId)
                  break
                }
              }
            }

            GrpActivity.settings = settings
            await NewGroupActivities.push(GrpActivity)
          }
        }
        //Save group activity
        for (const NewGroupActivity of NewGroupActivities) {
          const res = await ActivityRepository._insert(output["data"], NewGroupActivity)
          try {
            let attachment_key = "lamp.dashboard.survey_description"
            if (NewGroupActivity.spec !== "lamp.survey") attachment_key = "lamp.dashboard.activity_details"
            const tags = await TypeRepository._get("a", <string>NewGroupActivity.id, attachment_key)
            await TypeRepository._get("a", <string>NewGroupActivity.id, attachment_key)
            await TypeRepository._set("a", "me", <string>res, attachment_key, tags)
            PubSubAPIListenerQueue?.add({
              topic: `activity`,
              token: `study.${output["data"]}.activity.${res}`,
              payload: { action: "create", activity_id: res, study_id: output["data"] },
            })
          } catch (error) {
            console.log("error clone2", error)
          }
        }

        //clone sensors  to new studyid
        for (const sensor of sensors) {
          let object = { name: sensor.name, spec: sensor.spec, settings: sensor.settings }
          await SensorRepository._insert(output["data"], object)
        }
      }
      //add participants if participants add flag is true
      if (should_add_participant) {
        const CredentialRepository = new Repository().getCredentialRepository()
        const participant = await ParticipantRepository._insert(output["data"], {})
        await CredentialRepository._insert(participant, {
          origin: participant,
          access_key: `${participant}@lamp.com`,
          secret_key: participant,
          description: "Temporary Login",
        })
      }
      study.researcher_id = researcher_id
      study.study_id = output["data"]
      study.action = "create"
      //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
      PubSubAPIListenerQueue?.add(
        {
          topic: `study`,
          token: `researcher.${researcher_id}.study.${output["data"]}`,
          payload: study,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        {
          topic: `researcher.*.study`,
          token: `researcher.${researcher_id}.study.${output["data"]}`,
          payload: study,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      res.json(output)
      setImmediate(async () => {
        try {
          const authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.researcher_id)

          const credential = await MongoClientDB.collection("credential").findOne({
            _id: new ObjectId(authSubject._id),
          })

          logAuditEvent({
            timestamp: new Date(),
            object_type: "study",
            object_id: req.params.researcher_id,
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
            authSubject = await _verify(req.get("Authorization"), ["self", "parent"], req.params.study_id)
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
            object_type: "study",
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
