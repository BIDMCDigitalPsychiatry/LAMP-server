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
import { Repository } from "../repository/Bootstrap"
import { ListenerAPI } from "../utils/ListenerAPI"
import { PushNotificationAPI } from "../utils/PushNotificationAPI"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export async function Query(query: string, auth: string | undefined, verify = true): Promise<any> {
  return new Promise((resolve, reject) => {
    jsonata(query).evaluate(
      {},
      {
        ActivityEvent_all: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const repo = new Repository()
          const ActivityEventRepository = repo.getActivityEventRepository()
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          return await ActivityEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
        },
        Activity_all: async (participant_or_study_id: string) => {
          const repo = new Repository()
          const ActivityRepository = repo.getActivityRepository()
          if (verify)
            participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          return await ActivityRepository._select(participant_or_study_id, true)
        },
        Activity_view: async (activity_id: string) => {
          const repo = new Repository()
          const ActivityRepository = repo.getActivityRepository()
          if (verify) activity_id = await _verify(auth, ["self", "sibling", "parent"], activity_id)
          return await ActivityRepository._select(activity_id)
        },
        Credential_list: async (type_id: string) => {
          const repo = new Repository()
          const CredentialRepository = repo.getCredentialRepository()
          if (verify) type_id = await _verify(auth, ["self", "parent"], type_id)
          return await CredentialRepository._select(type_id)
        },
        Participant_all: async (study_id: string) => {
          const repo = new Repository()
          const ParticipantRepository = repo.getParticipantRepository()
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          return await ParticipantRepository._select(study_id, true)
        },
        Participant_view: async (participant_id: string) => {
          const repo = new Repository()
          const ParticipantRepository = repo.getParticipantRepository()
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          return await ParticipantRepository._select(participant_id)
        },
        // Researcher_all: async () => {
        //   if (verify) await _verify(auth, [])
        //   return await ResearcherRepository._select()
        // },
        // Researcher_view: async (researcher_id: string) => {
        //   if (verify) researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
        //   return await ResearcherRepository._select(researcher_id)
        // },
        SensorEvent_all: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const repo = new Repository()
          const SensorEventRepository = repo.getSensorEventRepository()
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          return await SensorEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
        },
        Study_all: async (researcher_id: string) => {
          const repo = new Repository()
          const StudyRepository = repo.getStudyRepository()
          if (verify) researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
          return await StudyRepository._select(researcher_id, true)
        },
        Study_view: async (study_id: string) => {
          const repo = new Repository()
          const StudyRepository = repo.getStudyRepository()
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          return await StudyRepository._select(study_id)
        },
        Sensor_all: async (participant_or_study_id: string) => {
          const repo = new Repository()
          const SensorRepository = repo.getSensorRepository()
          if (verify)
            participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          return await SensorRepository._select(participant_or_study_id, true)
        },
        Sensor_view: async (sensor_id: string) => {
          const repo = new Repository()
          const SensorRepository = repo.getSensorRepository()
          if (verify) sensor_id = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
          return await SensorRepository._select(sensor_id)
        },
        Type_parent: async (type_id: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          return await TypeRepository._parent(type_id)
        },
        Tags_list: async (type_id: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          return (<string[]>[]).concat(
            await TypeRepository._list("a", <string>type_id),
            (await TypeRepository._list("b", <string>type_id)).map((x: any) => "dynamic/" + x)
          )
        },
        Tags_view: async (type_id: string, attachment_key: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
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

const PushNotificationService = Router()
PushNotificationService.use(PushNotificationAPI)

API.post("/", async (req, res) => {
  try {
    const data = await Query(req.body ?? "", req.get("Authorization"))
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
export default API
