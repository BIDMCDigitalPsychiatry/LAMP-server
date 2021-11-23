import { Request, Response, Router } from "express"
import { _verify } from "./Security"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository } from "../repository/Bootstrap"

export class ActivityService {
  public static _name = "Activity"
  public static Router = Router()

  public static async list(auth: any, study_id: string, ignore_binary: boolean, sibling = false) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await ActivityRepository._select(study_id, true, ignore_binary)
  }

  public static async create(auth: any, study_id: string, activity: any) {
    const ActivityRepository = new Repository().getActivityRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
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
    activity_id = await _verify(auth, ["self", "sibling", "parent"], activity_id)
    return await ActivityRepository._select(activity_id)
  }

  public static async set(auth: any, activity_id: string, activity: any | null) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    activity_id = await _verify(auth, ["self", "sibling", "parent"], activity_id)
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
      activity.activity_id = activity_id
      activity.action = "update"
      activity.settings = undefined
      activity.schedule = undefined
      activity.photo = undefined
      PubSubAPIListenerQueue?.add({ topic: `activity.*`, payload: activity })
      PubSubAPIListenerQueue?.add({ topic: `activity`, payload: activity })
      PubSubAPIListenerQueue?.add({ topic: `study.*.activity`, payload: activity })
      return data
    }
  }
}

ActivityService.Router.post("/study/:study_id/activity", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ActivityService.create(req.get("Authorization"), req.params.study_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.put("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ActivityService.set(req.get("Authorization"), req.params.activity_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.delete("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ActivityService.set(req.get("Authorization"), req.params.activity_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/activity/:activity_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await ActivityService.get(req.get("Authorization"), req.params.activity_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/participant/:participant_id/activity", async (req: Request, res: Response) => {
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
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/study/:study_id/activity", async (req: Request, res: Response) => {
  try {
    let output = {
      data: await ActivityService.list(
        req.get("Authorization"),
        req.params.study_id,
        req.query.ignore_binary === "true"
      ),
    }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
