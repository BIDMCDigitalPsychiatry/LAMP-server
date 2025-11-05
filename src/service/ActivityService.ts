import { Request, Response, Router } from "express"
import { _authorize } from "./Security"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"
const { activityValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")

export class ActivityService {
  public static _name = "Activity"
  public static Router = Router()

  public static async list(actingUser: Session["user"], study_id: string, ignore_binary: boolean, sibling = false) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await ActivityRepository._select(study_id, true, ignore_binary)
  }

  public static async create(actingUser: Session["user"], study_id: string, activity: any) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], study_id)
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

  public static async get(actingUser: Session["user"], activity_id: string) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], activity_id)
    return await ActivityRepository._select(activity_id, false)
  }

  public static async set(actingUser: Session["user"], activity_id: string, activity: any | null) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _authorize(actingUser, ["self", "sibling", "parent"], activity_id)

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
        PubSubAPIListenerQueue.on("waiting", (jobId) => {
          console.log(`[Queue waiting] Job ID: ${jobId}`)
        })

        PubSubAPIListenerQueue.on("active", (job) => {
          console.log(`[Queue active] Processing job:`, job.data)
        })

        PubSubAPIListenerQueue.on("completed", (job, result) => {
          console.log(`[Queue completed] Job ID: ${job.id}, result:`, result)
        })

        PubSubAPIListenerQueue.on("failed", (job, err) => {
          console.error(`[Queue failed] Job ID: ${job.id}, error:`, err)
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
  authenticateSession,
  activityValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivityService.create(res.locals.user, req.params.study_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityService.Router.put(
  "/activity/:activity_id",
  authenticateSession,
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivityService.set(res.locals.user, req.params.activity_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityService.Router.delete("/activity/:activity_id", authenticateSession, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({ data: await ActivityService.set(res.locals.user, req.params.activity_id, null) })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/activity/:activity_id", authenticateSession, async (req: Request, res: Response) => { // TODO: This did not originally have authenticateToken, double check that this should actually be authenticated
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await ActivityService.get(res.locals.user, req.params.activity_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get(
  "/participant/:participant_id/activity",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityService.list(
          res.locals.user,
          req.params.participant_id,
          req.query.ignore_binary === "true",
          true
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
ActivityService.Router.get("/study/:study_id/activity", authenticateSession, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = {
      data: await ActivityService.list(
        res.locals.user,
        req.params.study_id,
        req.query.ignore_binary === "true"
      ),
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
