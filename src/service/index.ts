import { Router, Request, Response } from "express"

import { TypeService } from "./TypeService"
import { CredentialService } from "./CredentialService"
import { ResearcherService } from "./ResearcherService"
import { StudyService } from "./StudyService"
import { ParticipantService } from "./ParticipantService"
import { ActivityService } from "./ActivityService"
import { ActivitySpecService } from "./ActivitySpecService"
import { ActivityEventService } from "./ActivityEventService"
import { SensorService } from "./SensorService"
import { SensorSpecService } from "./SensorSpecService"
import { SensorEventService } from "./SensorEventService"

import jsonata from "jsonata"
import { _verify } from "../service/Security"
import { ActivityEventRepository } from "../repository/ActivityEventRepository"
import { ActivityRepository } from "../repository/ActivityRepository"
import { CredentialRepository } from "../repository/CredentialRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { SensorEventRepository } from "../repository/SensorEventRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { TypeRepository } from "../repository/TypeRepository"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { ListenerAPI } from "../utils/ListenerAPI"

export async function Query(query: string, auth: string | undefined, verify = true): Promise<any> {
  return new Promise((resolve, reject) => {
    jsonata(query).evaluate(
      {},
      {
        ActivityEvent_all: async (participant_id: string, origin: string, from: number, to: number) => {
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          return await ActivityEventRepository._select(participant_id, origin, from, to)
        },
        Activity_view: async (participant_or_study_id: string) => {
          if (verify)
            participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          return await ActivityRepository._select(participant_or_study_id)
        },
        Credential_list: async (type_id: string) => {
          if (verify) type_id = await _verify(auth, ["self", "parent"], type_id)
          return await CredentialRepository._select(type_id)
        },
        Participant_all: async (study_id: string) => {
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          return await ParticipantRepository._select(study_id)
        },
        Participant_view: async (participant_id: string) => {
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          return await ParticipantRepository._select(participant_id)
        },
        Researcher_all: async () => {
          if (verify) await _verify(auth, [])
          return await ResearcherRepository._select()
        },
        Researcher_view: async (researcher_id: string) => {
          if (verify) researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
          return await ResearcherRepository._select(researcher_id)
        },
        SensorEvent_all: async (participant_id: string, origin: string, from: number, to: number) => {
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          return await SensorEventRepository._select(participant_id, origin, from, to)
        },
        Study_all: async (researcher_id: string) => {
          if (verify) researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
          return await StudyRepository._select(researcher_id)
        },
        Study_view: async (study_id: string) => {
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          return await StudyRepository._select(study_id)
        },
        Type_parent: async (type_id: string) => {
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          return await TypeRepository._parent(type_id)
        },
        Tags_list: async (type_id: string) => {
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          return (<string[]>[]).concat(
            await TypeRepository._list("a", <string>type_id),
            (await TypeRepository._list("b", <string>type_id)).map((x) => "dynamic/" + x)
          )
        },
        Tags_view: async (type_id: string, attachment_key: string) => {
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let x = null
          try {
            x = await TypeRepository._get("a", <string>type_id, attachment_key)
          } catch (e) {}
          return x
        },
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
  })
}

const API = Router()
API.use(TypeService)
API.use(CredentialService)
API.use(ResearcherService)
API.use(StudyService)
API.use(ParticipantService)
API.use(ActivityService)
API.use(ActivitySpecService)
API.use(ActivityEventService)
API.use(SensorService)
API.use(SensorSpecService)
API.use(SensorEventService)

const ListenerAPIs = Router()
ListenerAPIs.use(ListenerAPI)

API.post("/", async (req, res) => {
  try {
    const data = await Query(req.body ?? "", req.get("Authorization"))
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
export default API
