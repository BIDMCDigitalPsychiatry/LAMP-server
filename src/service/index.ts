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

const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { _verify } from "../service/Security"
import { Repository } from "../repository/Bootstrap"
import { ListenerAPI } from "../utils/ListenerAPI"
import { PushNotificationAPI } from "../utils/PushNotificationAPI"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

export async function Query(query: string, auth: string | undefined, verify = true): Promise<any> {
  return await jsonata(query).evaluate(
      {},
      {
        ActivityEvent_all: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const repo = new Repository()
          const ActivityEventRepository = repo.getActivityEventRepository()
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          let _start = Date.now()
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          let x = await ActivityEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
          console.log(` -- ActivityEvent_all: ${Date.now() - _start}`)
          return x 
        },
        Activity_all: async (participant_or_study_id: string) => {
          const repo = new Repository()
          const ActivityRepository = repo.getActivityRepository()
          if (verify)
            participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          let _start = Date.now()
          let x = await ActivityRepository._select(participant_or_study_id, true)
          console.log(` -- Activity_all: ${Date.now() - _start}`)
          return x 
        },
        Activity_view: async (activity_id: string) => {
          const repo = new Repository()
          const ActivityRepository = repo.getActivityRepository()
          if (verify) activity_id = await _verify(auth, ["self", "sibling", "parent"], activity_id)
          let _start = Date.now()
          let x = await ActivityRepository._select(activity_id)
          console.log(` -- Activity_view: ${Date.now() - _start}`)
          return x 
        },
        Credential_list: async (type_id: string) => {
          const repo = new Repository()
          const CredentialRepository = repo.getCredentialRepository()
          if (verify) type_id = await _verify(auth, ["self", "parent"], type_id)
          let _start = Date.now()
          let x = await CredentialRepository._select(type_id)
          console.log(` -- Credential_list: ${Date.now() - _start}`)
          return x 
        },
        Participant_all: async (study_id: string) => {
          const repo = new Repository()
          const ParticipantRepository = repo.getParticipantRepository()
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          let _start = Date.now()
          let x = await ParticipantRepository._select(study_id, true)
          console.log(` -- Participant_all: ${Date.now() - _start}`)
          return x 
        },
        Participant_view: async (participant_id: string) => {
          const repo = new Repository()
          const ParticipantRepository = repo.getParticipantRepository()
          if (verify) participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          let _start = Date.now()
          let x = await ParticipantRepository._select(participant_id)
          console.log(` -- Particpant_view: ${Date.now() - _start}`)
          return x 
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
          let _start = Date.now()
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          let x = await SensorEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
          console.log(` -- SensorEvent_all: ${Date.now() - _start}`)
          return x 
        },
        Study_all: async (researcher_id: string) => {
          const repo = new Repository()
          const StudyRepository = repo.getStudyRepository()
          if (verify) researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
          let _start = Date.now()
          let x = await StudyRepository._select(researcher_id, true)
          console.log(` -- Study_all: ${Date.now() - _start}`)
          return x 
        },
        Study_view: async (study_id: string) => {
          const repo = new Repository()
          const StudyRepository = repo.getStudyRepository()
          if (verify) study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          let _start = Date.now()
          let x = await StudyRepository._select(study_id)
          console.log(` -- Study_view: ${Date.now() - _start}`)
          return x 
        },
        Sensor_all: async (participant_or_study_id: string) => {
          const repo = new Repository()
          const SensorRepository = repo.getSensorRepository()
          if (verify)
            participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          let _start = Date.now()
          let x = await SensorRepository._select(participant_or_study_id, true)
          console.log(` -- Sensor_all: ${Date.now() - _start}`)
          return x 
        },
        Sensor_view: async (sensor_id: string) => {
          const repo = new Repository()
          const SensorRepository = repo.getSensorRepository()
          if (verify) sensor_id = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
          let _start = Date.now()
          let x = await SensorRepository._select(sensor_id)
          console.log(` -- Sensor_view: ${Date.now() - _start}`)
          return x 
        },
        Type_parent: async (type_id: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = await TypeRepository._parent(type_id)
          console.log(` -- Type_parent: ${Date.now() - _start}`)
          return x 
        },
        Tags_list: async (type_id: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = (<string[]>[]).concat(
            await TypeRepository._list("a", <string>type_id),
            (await TypeRepository._list("b", <string>type_id)).map((x: any) => "dynamic/" + x)
          )
          console.log(` -- Tags_list: ${Date.now() - _start}`)
          return x 
        },
        Tags_view: async (type_id: string, attachment_key: string) => {
          const repo = new Repository()
          const TypeRepository = repo.getTypeRepository()
          if (verify) type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = null
          try {
            x = await TypeRepository._get("a", <string>type_id, attachment_key)
          } catch (e) {}
          console.log(` -- Tags_view: ${Date.now() - _start}`)
          return x 
        },
      }
    )
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
    let _start = Date.now()
    const data = await Query(req.body ?? "", req.get("Authorization"), false)
    console.log(`Query: ${((Date.now() - _start)).toFixed(2)} ms`)
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
export default API
