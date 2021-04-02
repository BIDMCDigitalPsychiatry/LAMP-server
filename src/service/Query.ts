import { Router } from "express"
import { OpenAPISchema } from "../utils"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { _verify, _createAuthSubject } from "../service/Security"
import { Repository } from "../repository/Bootstrap"

// default to LIMIT_NAN, clamped to [-LIMIT_MAX, +LIMIT_MAX]
const LIMIT_NAN = 1000
const LIMIT_MAX = 2_147_483_647

// TODO: ActivityEvent_create, SensorEvent_create, Activity_create, Activity_update, Activity_delete,
//       Sensor_create, Sensor_update, Sensor_delete, Study_create, Study_update, Study_delete,
//       Researcher_create, Researcher_update, Researcher_delete

export const QueryAPI = Router()
export async function Query(query: string, auth: any): Promise<any> {
  return await jsonata(query).evaluate(
      {},
      {
        ActivityEvent_all: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const ActivityEventRepository = new Repository().getActivityEventRepository()
          participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          let _start = Date.now()
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          let x = await ActivityEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
          console.log(` -- ActivityEvent_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_all: async (participant_or_study_id: string) => {
          const ActivityRepository = new Repository().getActivityRepository()
          participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          let _start = Date.now()
          let x = await ActivityRepository._select(participant_or_study_id, true)
          console.log(` -- Activity_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_view: async (activity_id: string) => {
          const ActivityRepository = new Repository().getActivityRepository()
          activity_id = await _verify(auth, ["self", "sibling", "parent"], activity_id)
          let _start = Date.now()
          let x = await ActivityRepository._select(activity_id)
          console.log(` -- Activity_view: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Credential_list: async (type_id: string) => {
          const CredentialRepository = new Repository().getCredentialRepository()
          type_id = await _verify(auth, ["self", "parent"], type_id)
          let _start = Date.now()
          let x = await CredentialRepository._select(type_id)
          console.log(` -- Credential_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_all: async (study_id: string) => {
          const ParticipantRepository = new Repository().getParticipantRepository()
          study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          let _start = Date.now()
          let x = await ParticipantRepository._select(study_id, true)
          console.log(` -- Participant_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_view: async (participant_id: string) => {
          const ParticipantRepository = new Repository().getParticipantRepository()
          participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          let _start = Date.now()
          let x = await ParticipantRepository._select(participant_id)
          console.log(` -- Particpant_view: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Researcher_all: async () => {
          const ResearcherRepository = new Repository().getResearcherRepository()
          await _verify(auth, [])
          let _start = Date.now()
          let x = await ResearcherRepository._select()  
          console.log(` -- Researcher_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x
        },
        Researcher_view: async (researcher_id: string) => {
          const ResearcherRepository = new Repository().getResearcherRepository()
          researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
          let _start = Date.now()
          let x = await ResearcherRepository._select(researcher_id)
          console.log(` -- Researcher_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        //Researcher_create: async () => {},
        SensorEvent_all: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const SensorEventRepository = new Repository().getSensorEventRepository()
          participant_id = await _verify(auth, ["self", "sibling", "parent"], participant_id)
          let _start = Date.now()
          const _limit = Math.min(Math.max(limit ?? LIMIT_NAN, -LIMIT_MAX), LIMIT_MAX)
          let x = await SensorEventRepository._select(
            participant_id,
            origin ?? undefined,
            from ?? undefined,
            to ?? undefined,
            _limit
          )
          console.log(` -- SensorEvent_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_all: async (researcher_id: string) => {
          const StudyRepository = new Repository().getStudyRepository()
          researcher_id = await _verify(auth, ["self", "sibling", "parent"], researcher_id)
          let _start = Date.now()
          let x = await StudyRepository._select(researcher_id, true)
          console.log(` -- Study_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_view: async (study_id: string) => {
          const StudyRepository = new Repository().getStudyRepository()
          study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
          let _start = Date.now()
          let x = await StudyRepository._select(study_id)
          console.log(` -- Study_view: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_all: async (participant_or_study_id: string) => {
          const SensorRepository = new Repository().getSensorRepository()
          participant_or_study_id = await _verify(auth, ["self", "sibling", "parent"], participant_or_study_id)
          let _start = Date.now()
          let x = await SensorRepository._select(participant_or_study_id, true)
          console.log(` -- Sensor_all: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_view: async (sensor_id: string) => {
          const SensorRepository = new Repository().getSensorRepository()
          sensor_id = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
          let _start = Date.now()
          let x = await SensorRepository._select(sensor_id)
          console.log(` -- Sensor_view: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Type_parent: async (type_id: string) => {
          const TypeRepository = new Repository().getTypeRepository()
          type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = await TypeRepository._parent(type_id)
          console.log(` -- Type_parent: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tags_list: async (type_id: string) => {
          const TypeRepository = new Repository().getTypeRepository()
          type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = (<string[]>[]).concat(
            await TypeRepository._list("a", <string>type_id),
            (await TypeRepository._list("b", <string>type_id)).map((x: any) => "dynamic/" + x)
          )
          console.log(` -- Tags_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tags_view: async (type_id: string, attachment_key: string) => {
          const TypeRepository = new Repository().getTypeRepository()
          type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = null // error
          try {
            x = await TypeRepository._get("a", <string>type_id, attachment_key)
          } catch (e) {}
          console.log(` -- Tags_view: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tags_create: async (type_id: string, attachment_key: string, target: string, attachment_value: string) => {
          const TypeRepository = new Repository().getTypeRepository()
          type_id = await _verify(auth, ["self", "sibling", "parent"], type_id)
          let _start = Date.now()
          let x = null // error
          try {
            x = await TypeRepository._set("a", target, <string>type_id, attachment_key, attachment_value)
          } catch (e) {}
          console.log(` -- Tags_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        }
      }
    )
}

QueryAPI.post("/", async (req, res) => {
  try {
    let _start = Date.now()
    // Make sure to cache the AuthSubject so we don't keep calling into CredentialRepository._find().
    const cachedAuth = await _createAuthSubject(req.get("Authorization"))
    const data = await Query(req.body ?? "", cachedAuth)
    // Log the query itself like an HTTP request with how long it took.
    console.log(`Query: ${((Date.now() - _start)).toFixed(2)} ms`)
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

QueryAPI.get("/", async (req, res) => res.json(OpenAPISchema))
export default QueryAPI
