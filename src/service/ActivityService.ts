import { Request, Response, Router } from "express"
import { _verify } from "./Security"
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"

export class ActivityService {
  public static _name = "Activity"
  public static Router = Router()

  public static async select(
    auth: string | undefined,
    study_id: string,
    ignore_binary: boolean,
    sibling = false,
    limit?: number,
    offset?: number,
    participantId?: string
  ) {
    const ActivityRepository = new Repository().getActivityRepository()
    const TypeRepository = new Repository().getTypeRepository()
    await _verify(auth, ["self", "sibling", "parent"], study_id)

    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)

      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await ActivityRepository._select(study_id, true, ignore_binary, limit, offset, participantId)
  }
  public static async list(auth: string | undefined, id: string, tab: any, limit?: number, offset?: number) {
    try {
      const ActivityRepository = new Repository().getActivityRepository()
      await _verify(auth, ["self", "sibling", "parent"], id)
      return await ActivityRepository._list(id, tab, limit, offset)
    } catch (e: unknown) {
      console.log(e)
      if (e instanceof Error) {
        return e.message
      }
      return String(e)
    }
  }

  public static async create(auth: any, study_id: string, activity: any) {
    const ActivityRepository = new Repository().getActivityRepository()
    await _verify(auth, ["self", "sibling", "parent"], study_id)
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

  public static async get(auth: string | undefined, activity_id: string, ignore_binary: boolean = false) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], activity_id)
    const result = await ActivityRepository._select(activity_id, false, ignore_binary)
    // Handle both return types: array or { data, total }
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null
    }
    return result.data.length > 0 ? result.data[0] : null
  }

  public static async set(auth: any, activity_id: string, activity: any | null) {
    try {
      const ActivityRepository = new Repository().getActivityRepository()
      const TypeRepository = new Repository().getTypeRepository()
      await _verify(auth, ["self", "sibling", "parent"], activity_id)
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

        PubSubAPIListenerQueue?.add(
          { topic: `activity.*`, payload: activity },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )

        PubSubAPIListenerQueue?.add(
          { topic: `activity`, payload: activity },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )

        PubSubAPIListenerQueue?.add(
          { topic: `study.*.activity`, payload: activity },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
        return data
      }
    } catch (e: unknown) {
      console.log(e)
      if (e instanceof Error) {
        return e.message
      }
      return String(e)
    }
  }
  public static async listModules(auth: any, module_id: string, participant_id: string) {
    const ActivityRepository = new Repository().getActivityRepository()
    await _verify(auth, ["self", "sibling", "parent"], module_id)
    const result = await ActivityRepository._listModule(module_id, participant_id)
    return result
  }

  public static async delete(auth: any, activities: string[]) {
    const ActivityRepository = new Repository().getActivityRepository()
    await _verify(auth, ["self", "sibling", "parent"])

    const result = await ActivityRepository._deleteActivities(activities)
    return result
  }

  public static async getFeedDetails(
    auth: string | undefined,
    participant_id: string,
    dateMs: string,
    tzOffsetMinutes?: number
  ) {
    const ActivityRepository = new Repository().getActivityRepository()
    const response: any = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    const result = await ActivityRepository._getFeedDetails(participant_id, dateMs, tzOffsetMinutes)
    return result
  }
}

ActivityService.Router.post(
  "/study/:study_id/activity",
  authenticateToken,

  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivityService.create(req.get("Authorization"), req.params.study_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityService.Router.put(
  "/activity/:activity_id",
  authenticateToken,

  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ActivityService.set(req.get("Authorization"), req.params.activity_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityService.Router.delete("/activity/:activity_id", authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({ data: await ActivityService.set(req.get("Authorization"), req.params.activity_id, null) })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

ActivityService.Router.delete("/activities", authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    const { activities } = req.body.activities
    res.json({ data: await ActivityService.delete(req.get("Authorization"), activities) })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/activity/:activity_id", async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    let output = { data: await ActivityService.get(req.get("Authorization"), req.params.activity_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get(
  "/participant/:participant_id/activity",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined
      const result = await ActivityService.select(
        req.get("Authorization"),
        req.params.participant_id,
        req.query.ignore_binary === "true",
        true,
        limit,
        offset,
        req.params.participant_id // Pass participantId to include favorites when offset is 0
      )
      // Handle both return types: array or { data, total }
      let output = Array.isArray(result) ? { data: result } : { data: result.data, total: result.total }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ActivityService.Router.get("/study/:study_id/activity", authenticateToken, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined
    const result: any = await ActivityService.select(
      req.get("Authorization"),
      req.params.study_id,
      req.query.ignore_binary === "true",
      false,
      limit,
      offset
    )
    // Handle both return types: array or { data, total }
    let output = Array.isArray(result)
      ? { data: result, total: result.length }
      : { data: result.data, total: result.total }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get("/activity/:participant_id/activity", async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    const tab = req.query.tab
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined

    const result = await ActivityService.list(req.get("Authorization"), req.params.participant_id, tab, limit, offset)

    // Handle error case (when result is a string error message)
    if (typeof result === "string") {
      throw new Error(result)
    }

    // Handle both return types: array or { data, total }
    let output = Array.isArray(result)
      ? { data: result, total: result.length }
      : {
          data: result.data,
          total: result.total,
        }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ActivityService.Router.get(
  "/module/:module_id/:participant_id",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityService.listModules(
          req.get("Authorization"),
          req.params.module_id,
          req.params.participant_id
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

ActivityService.Router.get(
  "/participant/:participant_id/feedDetails",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ActivityService.getFeedDetails(
          req.get("Authorization"),
          req.params.participant_id,
          req.query.date?.toString() ?? "",
          typeof req.query.tzOffsetMinutes !== "undefined" ? Number(req.query.tzOffsetMinutes) : undefined
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
