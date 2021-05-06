import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

export class ParticipantService {
  public static _name = "Participant"
  public static Router = Router()

  public static async list(auth: any, study_id: string, sibling = false) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const TypeRepository = new Repository().getTypeRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await ParticipantRepository._select(study_id, true)
  }

  // TODO: activity/* and sensor/* entry
  public static async create(auth: any, study_id: string, participant: any) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
    const data = await ParticipantRepository._insert(study_id, participant)

    //publishing data for participant add api with token = study.{study_id}.participant.{_id}
    participant.study_id = study_id
    participant.participant_id = data.id
    participant.action = "create"
    PubSubAPIListenerQueue?.add({
      topic: `participant`,
      token: `study.${study_id}.participant.${data.id}`,
      payload: participant,
    })
    PubSubAPIListenerQueue?.add({
      topic: `study.*.participant`,
      token: `study.${study_id}.participant.${data.id}`,
      payload: participant,
    })
    return data
  }

  public static async get(auth: any, participant_id: string) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    return await ParticipantRepository._select(participant_id)
  }

  public static async set(auth: any, participant_id: string, participant: any | null) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const TypeRepository = new Repository().getTypeRepository()
    participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
    if (participant === null) {
      participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
      //find the study id before delete, as it cannot be fetched after delete
      const parent = (await TypeRepository._parent(participant_id)) as any
      const data = await ParticipantRepository._delete(participant_id)

      //publishing data for participant delete api for the Token study.{study_id}.participant.{participant_id}
      if (parent !== undefined && parent !== "") {
        PubSubAPIListenerQueue?.add({
          topic: `study.*.participant`,
          token: `study.${parent["Study"]}.participant.${participant_id}`,
          payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
        })
        PubSubAPIListenerQueue?.add({
          topic: `participant.*`,
          token: `study.${parent["Study"]}.participant.${participant_id}`,
          payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
        })
        PubSubAPIListenerQueue?.add({
          topic: `participant`,
          token: `study.${parent["Study"]}.participant.${participant_id}`,
          payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
        })
      }
      return data
    } else {
      const data = await ParticipantRepository._update(participant_id, participant)

      //publishing data for participant update api (Token will be created in PubSubAPIListenerQueue consumer, as study for this participant need to fetched to create token)
      participant.participant_id = participant_id
      participant.action = "update"
      PubSubAPIListenerQueue?.add({ topic: `participant.*`, payload: participant })
      PubSubAPIListenerQueue?.add({ topic: `participant`, payload: participant })
      PubSubAPIListenerQueue?.add({ topic: `study.*.participant`, payload: participant })
      return data
    }
  }
}

ParticipantService.Router.post("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ParticipantService.create(req.get("Authorization"), req.params.study_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.put("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ParticipantService.set(req.get("Authorization"), req.params.participant_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.delete("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ParticipantService.set(req.get("Authorization"), req.params.participant_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.get("/participant/:participant_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await ParticipantService.get(req.get("Authorization"), req.params.participant_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.get("/activity/:activity_id/participant", async (req: Request, res: Response) => {
  try {
    let output = { data: await ParticipantService.list(req.get("Authorization"), req.params.activity_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.get("/sensor/:sensor_id/participant", async (req: Request, res: Response) => {
  try {
    let output = { data: await ParticipantService.list(req.get("Authorization"), req.params.sensor_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ParticipantService.Router.get("/study/:study_id/participant", async (req: Request, res: Response) => {
  try {
    let output = { data: await ParticipantService.list(req.get("Authorization"), req.params.study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
