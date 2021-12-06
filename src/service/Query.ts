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

const METHOD_LIST = (auth: any) => ({
  LAMP: {
    ActivityEvent: {
      list: async (participant_id: string, origin: string | null, from: number | null, to: number | null, limit: number | null) => {
        const _start = Date.now()
        // Use ?? operator to convert null values to undefined as the service and repository layers require that.
        const x = await ActivityEventService.list(auth, participant_id, origin ?? undefined, from ?? undefined, to ?? undefined, limit ?? undefined)
        console.log(` -- LAMP.ActivityEvent.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (participant_id: string, activity_events: any | any[]) => {
        const _start = Date.now()
        const x = await ActivityEventService.create(auth, participant_id, Array.isArray(activity_events) ? activity_events : [activity_events])
        console.log(` -- LAMP.ActivityEvent.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Activity: {
      list: async (study_id: string, ignore_binary: boolean = true, sibling: boolean = false) => {
        const _start = Date.now()
        const x = await ActivityService.list(auth, study_id, ignore_binary, sibling)
        console.log(` -- LAMP.Activity.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (activity_id: string, activity: any) => {
        const _start = Date.now()
        const x = await ActivityService.create(auth, activity_id, activity)
        console.log(` -- LAMP.Activity.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (activity_id: string) => {
        const _start = Date.now()
        const x = await ActivityService.get(auth, activity_id)
        console.log(` -- LAMP.Activity.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (activity_id: string, activity: any | null) => {
        const _start = Date.now()
        const x = await ActivityService.set(auth, activity_id, activity)
        console.log(` -- LAMP.Activity.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    ActivitySpec: {
      list: async () => {
        const _start = Date.now()
        const x = await ActivitySpecService.list(auth, null)
        console.log(` -- LAMP.ActivitySpec.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (activity_spec: any) => {
        const _start = Date.now()
        const x = await ActivitySpecService.create(auth, null, activity_spec)
        console.log(` -- LAMP.ActivitySpec.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (activity_spec_id: string) => {
        const _start = Date.now()
        const x = await ActivitySpecService.get(auth, activity_spec_id)
        console.log(` -- LAMP.ActivitySpec.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (activity_spec_id: string, activity_spec: any | null) => {
        const _start = Date.now()
        const x = await ActivitySpecService.set(auth, activity_spec_id, activity_spec)
        console.log(` -- LAMP.ActivitySpec.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Credential: {
      list: async (type_id: string | null) => {
        const _start = Date.now()
        const x = await CredentialService.list(auth, type_id)
        console.log(` -- LAMP.Credential.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (type_id: string | null, credential: any) => {
        const _start = Date.now()
        const x = await CredentialService.create(auth, type_id, credential)
        console.log(` -- LAMP.Credential.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (type_id: string | null, access_key: string) => {
        const _start = Date.now()
        const x = await CredentialService.get(auth, type_id, access_key)
        console.log(` -- LAMP.Credential.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (type_id: string | null, access_key: string, credential: any | null) => {
        const _start = Date.now()
        const x = await CredentialService.set(auth, type_id, access_key, credential)
        console.log(` -- LAMP.Credential.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Participant: {
      list: async (study_id: string, sibling: boolean = false) => {
        const _start = Date.now()
        const x = await ParticipantService.list(auth, study_id, sibling)
        console.log(` -- LAMP.Participant.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (study_id: string, participant: any) => {
        const _start = Date.now()
        const x = await ParticipantService.create(auth, study_id, participant)
        console.log(` -- LAMP.Participant.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (participant_id: string) => {
        const _start = Date.now()
        const x = await ParticipantService.get(auth, participant_id)
        console.log(` -- LAMP.Participant.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (participant_id: string, participant: any) => {
        const _start = Date.now()
        const x = await ParticipantService.set(auth, participant_id, participant)
        console.log(` -- LAMP.Participant.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Researcher: {
      list: async () => {
        const _start = Date.now()
        const x = await ResearcherService.list(auth, null)
        console.log(` -- LAMP.Researcher.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x
      },
      create: async (researcher: any) => {
        const _start = Date.now()
        const x = await ResearcherService.create(auth, null, researcher)
        console.log(` -- LAMP.Researcher.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (researcher_id: string) => {
        const _start = Date.now()
        const x = await ResearcherService.get(auth, researcher_id)
        console.log(` -- LAMP.Researcher.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x
      },
      set: async (researcher_id: string, researcher: any | null) => {
        const _start = Date.now()
        const x = await ResearcherService.set(auth, researcher_id, researcher)
        console.log(` -- LAMP.Researcher.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    SensorEvent: {
      list: async (participant_id: string, origin: string | null, from: number | null, to: number | null, limit: number | null) => {
        const _start = Date.now()
        // Use ?? operator to convert null values to undefined as the service and repository layers require that.
        const x = await SensorEventService.list(auth, participant_id, origin ?? undefined, from ?? undefined, to ?? undefined, limit ?? undefined)
        console.log(` -- LAMP.SensorEvent.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (participant_id: string, sensor_events: any | any[]) => {
        const _start = Date.now()
        const x = await SensorEventService.create(auth, participant_id, Array.isArray(sensor_events) ? sensor_events : [sensor_events])
        console.log(` -- LAMP.SensorEvent.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Sensor: {
      list: async (study_id: string, ignore_binary: boolean = true, sibling: boolean = false) => {
        const _start = Date.now()
        const x = await SensorService.list(auth, study_id, ignore_binary, sibling)
        console.log(` -- LAMP.Sensor.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (study_id: string, sensor: any) => {
        const _start = Date.now()
        const x = await SensorService.create(auth, study_id, sensor)
        console.log(` -- LAMP.Sensor.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (sensor_id: string) => {
        const _start = Date.now()
        const x = await SensorService.get(auth, sensor_id)
        console.log(` -- LAMP.Sensor.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (sensor_id: string, sensor: any | null) => {
        const _start = Date.now()
        const x = await SensorService.set(auth, sensor_id, sensor)
        console.log(` -- LAMP.Sensor.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    SensorSpec: {
      list: async () => {
        const _start = Date.now()
        const x = await SensorSpecService.list(auth, null)
        console.log(` -- LAMP.SensorSpec.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (sensor_spec: any) => {
        const _start = Date.now()
        const x = await SensorSpecService.create(auth, null, sensor_spec)
        console.log(` -- LAMP.SensorSpec.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (sensor_spec_id: string) => {
        const _start = Date.now()
        const x = await SensorSpecService.get(auth, sensor_spec_id)
        console.log(` -- LAMP.SensorSpec.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (sensor_spec_id: string, sensor_spec: any | null) => {
        const _start = Date.now()
        const x = await SensorSpecService.set(auth, sensor_spec_id, sensor_spec)
        console.log(` -- LAMP.SensorSpec.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Study: {
      list: async (researcher_id: string) => {
        const _start = Date.now()
        const x = await StudyService.list(auth, researcher_id)
        console.log(` -- LAMP.Study.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      create: async (researcher_id: string, study: any) => {
        const _start = Date.now()
        const x = await StudyService.create(auth, researcher_id, study)
        console.log(` -- LAMP.Study.create: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (study_id: string) => {
        const _start = Date.now()
        const x = await StudyService.get(auth, study_id)
        console.log(` -- LAMP.Study.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (study_id: string, study: any | null) => {
        const _start = Date.now()
        const x = await StudyService.set(auth, study_id, study)
        console.log(` -- LAMP.Study.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Type: {
      parent: async (type_id: string) => {
        const _start = Date.now()
        const x = await TypeService.parent(auth, type_id)
        console.log(` -- LAMP.Type.parent: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
    },
    Tag: {
      list: async (type_id: string) => {
        const _start = Date.now()
        const x = await TypeService.list(auth, type_id)
        console.log(` -- LAMP.Tag.list: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      get: async (type_id: string, attachment_key: string) => {
        const _start = Date.now()
        let x = null // error
        try {
          x = await TypeService.get(auth, type_id, attachment_key)
        } catch (e) {}
        console.log(` -- LAMP.Tag.get: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      },
      set: async (type_id: string,  target: string, attachment_key: string, attachment_value: string) => {
        const _start = Date.now()
        let x = null // error
        try {
          x = await TypeService.set(auth, type_id, target, attachment_key, attachment_value)
        } catch (e) {}
        console.log(` -- LAMP.Tag.set: ${((Date.now() - _start)).toFixed(2)} ms`)
        return x 
      }
    },
  }
})

export const QueryAPI = Router()
QueryAPI.get("/", async (req, res) => res.json(OpenAPISchema))
QueryAPI.post("/", async (req, res) => {
  try {
    const _start = Date.now()
    // Make sure to cache the AuthSubject so we don't keep calling into CredentialRepository._find().
    const cachedAuth = await _createAuthSubject(req.get("Authorization"))
    const data = await jsonata(req.body ?? "null").evaluate({}, METHOD_LIST(cachedAuth))
    // Log the query itself like an HTTP request with how long it took.
    console.log(`Query: ${((Date.now() - _start)).toFixed(2)} ms`)
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
export default QueryAPI
