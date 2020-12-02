import { Request, Response, Router } from "express"
import { Study } from "../model/Study"
import { StudyRepository } from "../repository/StudyRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { TypeRepository } from "../repository/TypeRepository"
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"

export const StudyService = Router()
StudyService.post("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    const study = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await StudyRepository._insert(researcher_id, study) }

    study.researcher_id = researcher_id
    study.action = "create"
    //publishing data
    PubSubAPIListenerQueue.add({ topic: `study`, token: `researcher.${researcher_id}.study.${output['data']}`, payload: study })
    PubSubAPIListenerQueue.add({
      topic: `researcher.*.study`,
      token: `researcher.${researcher_id}.study.${output['data']}`,
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
    let study_id = req.params.study_id
    const study = req.body
    study_id = await _verify(req.get("Authorization"), ["self", "parent"], study_id)
    const output = { data: await StudyRepository._update(study_id, study) }

    study.study_id = study_id
    study.action = "update"

    //publishing data
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

    //publishing data
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

    res.json()
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.get("/study/:study_id", async (req: Request, res: Response) => {
  try {
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
