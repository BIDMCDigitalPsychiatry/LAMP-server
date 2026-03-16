import { Request, Response, Router } from "express"
import { _authorize, ApiKeyAccessLevels } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
import { ActingUserContext, authenticateSession } from "../middlewares/authenticateSession"
import { Session } from "../utils/auth"

export class ParticipantService {
  public static _name = "Participant"
  public static Router = Router()

  public static async list(actingUserContext: ActingUserContext, study_id: string) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], study_id, ApiKeyAccessLevels.STANDARD)
    return await ParticipantRepository._select(study_id, true)
  }

  // TODO: activity/* and sensor/* entry
  public static async create(actingUserContext: ActingUserContext, study_id: string, participant: any) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], study_id, ApiKeyAccessLevels.RESEARCHER)
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
    PubSubAPIListenerQueue?.add(
      {
        topic: `study.*.participant`,
        token: `study.${study_id}.participant.${data.id}`,
        payload: participant,
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }

  public static async get(actingUserContext: ActingUserContext, participant_id: string) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], participant_id, ApiKeyAccessLevels.STANDARD)
    if (participant_id !== "me") {
      return await ParticipantRepository._select(participant_id)
    }
    return await ParticipantRepository._select(response)
  }

  public static async set(actingUserContext: ActingUserContext, participant_id: string, participant: any | null) {
    const ParticipantRepository = new Repository().getParticipantRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], participant_id, ApiKeyAccessLevels.RESEARCHER)
    if (participant === null) {
      //find the study id before delete, as it cannot be fetched after delete
      const parent = (await TypeRepository._parent(participant_id)) as any
      const data = await ParticipantRepository._delete(participant_id)

      //publishing data for participant delete api for the Token study.{study_id}.participant.{participant_id}
      if (parent !== undefined && parent !== "") {
        PubSubAPIListenerQueue?.add(
          {
            topic: `study.*.participant`,
            token: `study.${parent["Study"]}.participant.${participant_id}`,
            payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
        PubSubAPIListenerQueue?.add(
          {
            topic: `participant.*`,
            token: `study.${parent["Study"]}.participant.${participant_id}`,
            payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
        PubSubAPIListenerQueue?.add(
          {
            topic: `participant`,
            token: `study.${parent["Study"]}.participant.${participant_id}`,
            payload: { action: "delete", participant_id: participant_id, study_id: parent["Study"] },
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
          }
        )
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

ParticipantService.Router.post(
  "/study/:study_id/participant",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ParticipantService.create(res.locals.actingUserContext, req.params.study_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.put(
  "/participant/:participant_id",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ParticipantService.set(res.locals.actingUserContext, req.params.participant_id, req.body) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.delete(
  "/participant/:participant_id",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({ data: await ParticipantService.set(res.locals.actingUserContext, req.params.participant_id, null) })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.get(
  "/participant/:participant_id",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ParticipantService.get(res.locals.actingUserContext, req.params.participant_id) }

      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.get(
  "/activity/:activity_id/participant",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ParticipantService.list(res.locals.actingUserContext, req.params.activity_id, true) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.get(
  "/sensor/:sensor_id/participant",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ParticipantService.list(res.locals.actingUserContext, req.params.sensor_id, true) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
ParticipantService.Router.get(
  "/study/:study_id/participant",
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ParticipantService.list(res.locals.actingUserContext, req.params.study_id) }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
