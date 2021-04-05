import { Router } from "express"
import { OpenAPISchema } from "../utils"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { _verify, _createAuthSubject } from "../service/Security"
import {
  ActivityEventService,
  SensorEventService,
  ActivityService,
  CredentialService,
  ActivitySpecService,
  ParticipantService,
  ResearcherService,
  SensorService,
  SensorSpecService,
  StudyService,
  TypeService
} from "."

export const QueryAPI = Router()
export async function Query(query: string, auth: any): Promise<any> {
  return await jsonata(query).evaluate(
      {},
      {
        ActivityEvent_list: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const _start = Date.now()
          const x = await ActivityEventService.list(auth, participant_id, origin, from, to, limit)
          console.log(` -- ActivityEvent_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        ActivityEvent_create: async (participant_id: string, activity_events: any | any[]) => {
          const _start = Date.now()
          const x = await ActivityEventService.create(auth, participant_id, Array.isArray(activity_events) ? activity_events : [activity_events])
          console.log(` -- ActivityEvent_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_list: async (study_id: string, ignore_binary: boolean = true, sibling: boolean = false) => {
          const _start = Date.now()
          const x = await ActivityService.list(auth, study_id, ignore_binary, sibling)
          console.log(` -- Activity_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_create: async (activity_id: string, activity: any) => {
          const _start = Date.now()
          const x = await ActivityService.create(auth, activity_id, activity)
          console.log(` -- Activity_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_get: async (activity_id: string) => {
          const _start = Date.now()
          const x = await ActivityService.get(auth, activity_id)
          console.log(` -- Activity_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Activity_set: async (activity_id: string, activity: any | null) => {
          const _start = Date.now()
          const x = await ActivityService.set(auth, activity_id, activity)
          console.log(` -- Activity_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        ActivitySpec_list: async () => {
          const _start = Date.now()
          const x = await ActivitySpecService.list(auth, null)
          console.log(` -- ActivitySpec_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        ActivitySpec_create: async (activity_spec: any) => {
          const _start = Date.now()
          const x = await ActivitySpecService.create(auth, null, activity_spec)
          console.log(` -- ActivitySpec_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        ActivitySpec_get: async (activity_spec_id: string) => {
          const _start = Date.now()
          const x = await ActivitySpecService.get(auth, activity_spec_id)
          console.log(` -- ActivitySpec_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        ActivitySpec_set: async (activity_spec_id: string, activity_spec: any | null) => {
          const _start = Date.now()
          const x = await ActivitySpecService.set(auth, activity_spec_id, activity_spec)
          console.log(` -- ActivitySpec_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Credential_list: async (type_id: string | null) => {
          const _start = Date.now()
          const x = await CredentialService.list(auth, type_id)
          console.log(` -- Credential_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Credential_create: async (type_id: string | null, credential: any) => {
          const _start = Date.now()
          const x = await CredentialService.create(auth, type_id, credential)
          console.log(` -- Credential_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Credential_get: async (type_id: string | null, access_key: string) => {
          const _start = Date.now()
          const x = await CredentialService.get(auth, type_id, access_key)
          console.log(` -- Credential_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Credential_set: async (type_id: string | null, access_key: string, credential: any | null) => {
          const _start = Date.now()
          const x = await CredentialService.set(auth, type_id, access_key, credential)
          console.log(` -- Credential_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_list: async (study_id: string, sibling: boolean = false) => {
          const _start = Date.now()
          const x = await ParticipantService.list(auth, study_id, sibling)
          console.log(` -- Participant_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_create: async (study_id: string, participant: any) => {
          const _start = Date.now()
          const x = await ParticipantService.create(auth, study_id, participant)
          console.log(` -- Participant_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_get: async (participant_id: string) => {
          const _start = Date.now()
          const x = await ParticipantService.get(auth, participant_id)
          console.log(` -- Participant_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Participant_set: async (participant_id: string, participant: any) => {
          const _start = Date.now()
          const x = await ParticipantService.set(auth, participant_id, participant)
          console.log(` -- Participant_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Researcher_list: async () => {
          const _start = Date.now()
          const x = await ResearcherService.list(auth, null)
          console.log(` -- Researcher_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x
        },
        Researcher_create: async (researcher: any) => {
          const _start = Date.now()
          const x = await ResearcherService.create(auth, null, researcher)
          console.log(` -- Researcher_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Researcher_get: async (researcher_id: string) => {
          const _start = Date.now()
          const x = await ResearcherService.get(auth, researcher_id)
          console.log(` -- Researcher_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x
        },
        Researcher_set: async (researcher_id: string, researcher: any | null) => {
          const _start = Date.now()
          const x = await ResearcherService.set(auth, researcher_id, researcher)
          console.log(` -- Researcher_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorEvent_list: async (participant_id: string, origin: string, from: number, to: number, limit: number) => {
          const _start = Date.now()
          const x = await SensorEventService.list(auth, participant_id, origin, from, to, limit)
          console.log(` -- SensorEvent_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorEvent_create: async (participant_id: string, sensor_events: any | any[]) => {
          const _start = Date.now()
          const x = await SensorEventService.create(auth, participant_id, Array.isArray(sensor_events) ? sensor_events : [sensor_events])
          console.log(` -- SensorEvent_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_list: async (study_id: string, ignore_binary: boolean = true, sibling: boolean = false) => {
          const _start = Date.now()
          const x = await SensorService.list(auth, study_id, ignore_binary, sibling)
          console.log(` -- Sensor_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_create: async (study_id: string, sensor: any) => {
          const _start = Date.now()
          const x = await SensorService.create(auth, study_id, sensor)
          console.log(` -- Sensor_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_get: async (sensor_id: string) => {
          const _start = Date.now()
          const x = await SensorService.get(auth, sensor_id)
          console.log(` -- Sensor_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Sensor_set: async (sensor_id: string, sensor: any | null) => {
          const _start = Date.now()
          const x = await SensorService.set(auth, sensor_id, sensor)
          console.log(` -- Sensor_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorSpec_list: async () => {
          const _start = Date.now()
          const x = await SensorSpecService.list(auth, null)
          console.log(` -- SensorSpec_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorSpec_create: async (sensor_spec: any) => {
          const _start = Date.now()
          const x = await SensorSpecService.create(auth, null, sensor_spec)
          console.log(` -- SensorSpec_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorSpec_get: async (sensor_spec_id: string) => {
          const _start = Date.now()
          const x = await SensorSpecService.get(auth, sensor_spec_id)
          console.log(` -- SensorSpec_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        SensorSpec_set: async (sensor_spec_id: string, sensor_spec: any | null) => {
          const _start = Date.now()
          const x = await SensorSpecService.set(auth, sensor_spec_id, sensor_spec)
          console.log(` -- SensorSpec_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_list: async (researcher_id: string) => {
          const _start = Date.now()
          const x = await StudyService.list(auth, researcher_id)
          console.log(` -- Study_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_create: async (researcher_id: string, study: any) => {
          const _start = Date.now()
          const x = await StudyService.create(auth, researcher_id, study)
          console.log(` -- Study_create: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_get: async (study_id: string) => {
          const _start = Date.now()
          const x = await StudyService.get(auth, study_id)
          console.log(` -- Study_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Study_set: async (study_id: string, study: any | null) => {
          const _start = Date.now()
          const x = await StudyService.set(auth, study_id, study)
          console.log(` -- Study_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Type_parent: async (type_id: string) => {
          const _start = Date.now()
          const x = await TypeService.parent(auth, type_id)
          console.log(` -- Type_parent: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tag_list: async (type_id: string) => {
          const _start = Date.now()
          const x = await TypeService.list(auth, type_id)
          console.log(` -- Tag_list: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tag_get: async (type_id: string, attachment_key: string) => {
          const _start = Date.now()
          let x = null // error
          try {
            x = await TypeService.get(auth, type_id, attachment_key)
          } catch (e) {}
          console.log(` -- Tag_get: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        },
        Tag_set: async (type_id: string, attachment_key: string, target: string, attachment_value: string) => {
          const _start = Date.now()
          let x = null // error
          try {
            x = await TypeService.set(auth, type_id, attachment_key, target, attachment_value)
          } catch (e) {}
          console.log(` -- Tag_set: ${((Date.now() - _start)).toFixed(2)} ms`)
          return x 
        }
      }
    )
}

QueryAPI.post("/", async (req, res) => {
  try {
    const _start = Date.now()
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
