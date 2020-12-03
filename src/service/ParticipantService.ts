import { Request, Response, Router } from "express"
import { Participant } from "../model/Participant"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { TypeRepository } from "../repository"
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"
export const ParticipantService = Router()
ParticipantService.post("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const participant = req.body
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    const output = { data: await ParticipantRepository._insert(study_id, participant) }
    participant.study_id = study_id
    participant.action = "create"
    
    //publishing data for participant add api with token = study.{study_id}.participant.{_id}
    PubSubAPIListenerQueue.add({ topic: `participant`, token: `study.${study_id}.participant.${output['data'].id}`, payload: participant })
    PubSubAPIListenerQueue.add({
      topic: `study.*.participant`,
      token: `study.${study_id}.participant.${output['data'].id}`,
      payload: participant,
    })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.put("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    const participant = req.body
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ParticipantRepository._update(participant_id, participant) }
    participant.participant_id = participant_id
    participant.action = "update"

    //publishing data for participant update api (Token will be created in PubSubAPIListenerQueue consumer, as study for this participant need to fetched to create token)
    PubSubAPIListenerQueue.add({ topic: `participant.*`, payload: participant })
    PubSubAPIListenerQueue.add({ topic: `participant`, payload: participant })
    PubSubAPIListenerQueue.add({ topic: `study.*.participant`, payload: participant })

    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.delete("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    let parent: any = ""
    //find the study id before delete, as it cannot be fetched after delete
    try {
      parent = await TypeRepository._parent(participant_id)
    } catch (error) {
      console.log("Error fetching Study")
    }
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    const output = { data: await ParticipantRepository._delete(participant_id) }

    //publishing data for participant delete api for the Token study.{study_id}.participant.{participant_id}
    if (parent !== undefined && parent !== "") {
      PubSubAPIListenerQueue.add({
        topic: `study.*.participant`,
        token: `study.${parent["Study"]}.participant.${participant_id}`,
        payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
      })
      PubSubAPIListenerQueue.add({
        topic: `participant.*`,
        token: `study.${parent["Study"]}.participant.${participant_id}`,
        payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
      })
      PubSubAPIListenerQueue.add({
        topic: `participant`,
        token: `study.${parent["Study"]}.participant.${participant_id}`,
        payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
      })
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let output = { data: await ParticipantRepository._select(participant_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/activity/:activity_id/participant", async (req: Request, res: Response) => {
  try {
    let activity_id = req.params.activity_id
    activity_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], activity_id)
    let study_id = await TypeRepository._owner(activity_id)
    if (study_id === null) throw new Error("403.invalid-sibling-ownership")
    let output = { data: await ParticipantRepository._select(study_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/sensor/:sensor_id/participant", async (req: Request, res: Response) => {
  try {
    let sensor_id = req.params.sensor_id
    sensor_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], sensor_id)
    let study_id = await TypeRepository._owner(sensor_id)
    if (study_id === null) throw new Error("403.invalid-sibling-ownership")
    let output = { data: await ParticipantRepository._select(study_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.get("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: await ParticipantRepository._select(study_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
// TODO: activity/* and sensor/* entry
