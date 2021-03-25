import { Request, Response, Router } from "express"
import { Study } from "../model/Study"

import { SecurityContext, ActionContext, _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"
import { UpdateToSchedulerQueue } from "../utils/queue/UpdateToSchedulerQueue"
import { Repository } from "../repository/Bootstrap"

export const StudyService = Router()
StudyService.post("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    let researcher_id = req.params.researcher_id
    const study = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await StudyRepository._insert(researcher_id, study) }

    study.researcher_id = researcher_id
    study.study_id = output["data"]
    study.action = "create"
    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    PubSubAPIListenerQueue.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    PubSubAPIListenerQueue.add({
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
StudyService.put("/study/:study_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    let study_id = req.params.study_id
    const study = req.body
    study_id = await _verify(req.get("Authorization"), ["self", "parent"], study_id)
    const output = { data: await StudyRepository._update(study_id, study) }

    study.study_id = study_id
    study.action = "update"

    //publishing data for study update api(Token will be created in PubSubAPIListenerQueue consumer, as researcher for this study need to fetched to create token)
    PubSubAPIListenerQueue.add({ topic: `study.*`, payload: study })
    PubSubAPIListenerQueue.add({ topic: `study`, payload: study })
    PubSubAPIListenerQueue.add({ topic: `researcher.*.study`, payload: study })

    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.delete("/study/:study_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    const TypeRepository = repo.getTypeRepository()
    let study_id = req.params.study_id
    let parent: any = ""
    try {
      parent = await TypeRepository._parent(study_id)
    } catch (error) {
      console.log("Error fetching Study")
    }
    study_id = await _verify(req.get("Authorization"), ["self", "parent"], study_id)
    let output = { data: await StudyRepository._delete(study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output

    //publishing data for study delete api with Token researcher.{researcher_id}.study.{study_id}
    PubSubAPIListenerQueue.add({
      topic: `study.*`,
      token: `researcher.${parent["Researcher"]}.study.${study_id}`,
      payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
    })
    PubSubAPIListenerQueue.add({
      topic: `study`,
      token: `researcher.${parent["Researcher"]}.study.${study_id}`,
      payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
    })
    PubSubAPIListenerQueue.add({
      topic: `researcher.*.study`,
      token: `researcher.${parent["Researcher"]}.study.${study_id}`,
      payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
    })

    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.get("/study/:study_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    let study_id = req.params.study_id
    study_id = await _verify(req.get("Authorization"), ["self", "parent"], study_id)
    let output = { data: await StudyRepository._select(study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.get("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    let output = { data: await StudyRepository._select(researcher_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
/** Clone study id to another-import activities,sensors to new studyid given
 *
 */
StudyService.post("/researcher/:researcher_id/study/clone", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const StudyRepository = repo.getStudyRepository()
    const ActivityRepository = repo.getActivityRepository()
    const SensorRepository = repo.getSensorRepository()
    const ParticipantRepository = repo.getParticipantRepository()
    let researcher_id = req.params.researcher_id
    const study = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await StudyRepository._insert(researcher_id, study) }
    let should_add_participant: boolean = req.body.should_add_participant ?? false
    let StudyID: string = req.body.study_id
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
        UpdateToSchedulerQueue.add({ activity_id: res })
      } catch (error) {}
    }
    //clone sensors  to new studyid
    for (const sensor of sensors) {
      let object = { name: sensor.name, spec: sensor.spec, settings: sensor.settings }
      await SensorRepository._insert(output["data"], object)
    }
    //add participants if participants add flag is true
    if (should_add_participant) {
      await ParticipantRepository._insert(output["data"], {})
    }
    study.researcher_id = researcher_id
    study.study_id = output["data"]
    study.action = "create"
    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    PubSubAPIListenerQueue.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    PubSubAPIListenerQueue.add({
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
