import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

export class StudyService {
  public static _name = "Study"
  public static Router = Router()

  public static async list(auth: any, researcher_id: string) {
    const StudyRepository = new Repository().getStudyRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    return await StudyRepository._select(researcher_id, true)
  }

  public static async create(auth: any, researcher_id: string, study: any) {
    const StudyRepository = new Repository().getStudyRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    const data = await StudyRepository._insert(researcher_id, study)

    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    study.researcher_id = researcher_id
    study.study_id = data
    study.action = "create"
    PubSubAPIListenerQueue?.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${data}`,
      payload: study,
    })
    PubSubAPIListenerQueue?.add({
      topic: `researcher.*.study`,
      token: `researcher.${researcher_id}.study.${data}`,
      payload: study,
    })
    return data
  }

  public static async get(auth: any, study_id: string) {
    const StudyRepository = new Repository().getStudyRepository()
    study_id = await _verify(auth, ["self", "parent"], study_id)
    return await StudyRepository._select(study_id)
  }

  public static async set(auth: any, study_id: string, study: any | null) {
    const StudyRepository = new Repository().getStudyRepository()
    const TypeRepository = new Repository().getTypeRepository()
    study_id = await _verify(auth, ["self", "parent"], study_id)
    if (study === null) {
      let parent = (await TypeRepository._parent(study_id)) as any
      const data = await StudyRepository._delete(study_id)

      //publishing data for study delete api with Token researcher.{researcher_id}.study.{study_id}
      PubSubAPIListenerQueue?.add({
        topic: `study.*`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      PubSubAPIListenerQueue?.add({
        topic: `study`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      PubSubAPIListenerQueue?.add({
        topic: `researcher.*.study`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      return data
    } else {
      const data = await StudyRepository._update(study_id, study)

      //publishing data for study update api(Token will be created in PubSubAPIListenerQueue consumer, as researcher for this study need to fetched to create token)
      study.study_id = study_id
      study.action = "update"
      PubSubAPIListenerQueue?.add({ topic: `study.*`, payload: study })
      PubSubAPIListenerQueue?.add({ topic: `study`, payload: study })
      PubSubAPIListenerQueue?.add({ topic: `researcher.*.study`, payload: study })
      return data
    }
  }
}

StudyService.Router.post("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.create(req.get("Authorization"), req.params.researcher_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.put("/study/:study_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.set(req.get("Authorization"), req.params.study_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.delete("/study/:study_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.set(req.get("Authorization"), req.params.study_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.get("/study/:study_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await StudyService.get(req.get("Authorization"), req.params.study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.get("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    let output = { data: await StudyService.list(req.get("Authorization"), req.params.researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

// Clone study id to another-import activities,sensors to new studyid given
StudyService.Router.post("/researcher/:researcher_id/study/clone", async (req: Request, res: Response) => {
  try {
    const StudyRepository = new Repository().getStudyRepository()
    const ActivityRepository = new Repository().getActivityRepository()
    const SensorRepository = new Repository().getSensorRepository()
    const ParticipantRepository = new Repository().getParticipantRepository()
    let researcher_id = req.params.researcher_id
    const study = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await StudyRepository._insert(researcher_id, study) }
    let should_add_participant: boolean = req.body.should_add_participant ?? false
    let StudyID: string | undefined =
      req.body.study_id === "" || req.body.study_id === "null" ? undefined : req.body.study_id
    if (!!StudyID) {
      let activities = await ActivityRepository._select(StudyID, true)
      let sensors = await SensorRepository._select(StudyID, true)
      //clone activities  to new studyid
      for (const activity of activities) {
        try {
          let object = {
            name: activity.name,
            spec: activity.spec,
            settings: activity.settings,
            schedule: activity.schedule,
          }
          const res = await ActivityRepository._insert(output["data"], object)
          //add the schedules of new activity
          // UpdateToSchedulerQueue?.add({ activity_id: res })
          PubSubAPIListenerQueue?.add({
            topic: `activity`,
            token: `study.${output["data"]}.activity.${res}`,
            payload: { action: "create", activity_id: res, study_id: output["data"] },
          })
        } catch (error) {}
      }
      //clone sensors  to new studyid
      for (const sensor of sensors) {
        let object = { name: sensor.name, spec: sensor.spec, settings: sensor.settings }
        await SensorRepository._insert(output["data"], object)
      }
    }
    //add participants if participants add flag is true
    if (should_add_participant) {
      await ParticipantRepository._insert(output["data"], {})
    }
    study.researcher_id = researcher_id
    study.study_id = output["data"]
    study.action = "create"
    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    PubSubAPIListenerQueue?.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    PubSubAPIListenerQueue?.add({
      topic: `researcher.*.study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
