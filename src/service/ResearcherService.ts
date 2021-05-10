import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue, CacheDataQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"
import { RedisClient } from "../repository/Bootstrap"

export class ResearcherService {
  public static _name = "Researcher"
  public static Router = Router()

  public static async list(auth: any, parent_id: null) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    const _ = await _verify(auth, [])
    return await ResearcherRepository._select()
  }

  public static async create(auth: any, parent_id: null, researcher: any) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    const _ = await _verify(auth, [])
    const data = await ResearcherRepository._insert(researcher)

    //publishing data for researcher add api with token = researcher.{_id}
    researcher.action = "create"
    researcher.researcher_id = data
    PubSubAPIListenerQueue?.add({ topic: `researcher`, token: `researcher.${data}`, payload: researcher })
    return data
  }

  public static async get(auth: any, researcher_id: string, lookup = false, _lookup?: string, studyID?: string) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    if (lookup === false) {
      const data = await ResearcherRepository._select(researcher_id)
      return data
    } else {      
      let activities: object[] = []
      let sensors: object[] = []
      let study_details: object[] = []
      const repo = new Repository()
      const ActivityRepository = repo.getActivityRepository()
      const SensorRepository = repo.getSensorRepository()
      const StudyRepository = repo.getStudyRepository()
      const ParticipantRepository = repo.getParticipantRepository()
      const TypeRepository = repo.getTypeRepository()
      let data: {} = {}
      //Fetch Studies
      const studies = !!studyID
        ? ((await StudyRepository._select(studyID, false)) as any)
        : ((await StudyRepository._select(researcher_id, true)) as any)
      if (_lookup === "participant") {
        let cacheData: any = {}
        cacheData = await RedisClient?.get(`${researcher_id}_lookup:participants`)
        console.log("cacheData", cacheData)
        if (null === cacheData || undefined !== studyID || undefined === cacheData) {
          console.log("cache data absent for participants")
          let tags = false
          try {
            tags = await TypeRepository._get("a", <string>researcher_id, "to.unityhealth.psychiatry.enabled")
          } catch (error) {}
          //fetch participants based on study and researcher tags  from database
          for (const study of studies) {
            let participants: object[] = []
            //Taking Participants count
            const Participants: any = await ParticipantRepository._lookup(study.id, true)
            study.participants_count = Participants.length
            for (const participant of Participants) {
              await participants.push({ ...participant, study_name: study.name })
            }
            await study_details.push({
              participant_count: Participants.length,
              id: study.id,
              name: study.name,
              participants: participants,
            })
          }
          if (undefined === studyID) {
            //add the list of participants and researcher tags to cache for next 5 mts
            try {
              CacheDataQueue?.add({
                key: `${researcher_id}_lookup:participants`,
                payload: { studies: study_details, unityhealth_settings: tags },
              })
            } catch (error) {}
          }
          data = { studies: study_details, unityhealth_settings: tags }
        } else {
          console.log("cache data present for activities")
          const result = JSON.parse(cacheData)
          data = { studies: result.studies, unityhealth_settings: result.unityhealth_settings }
        }
      } else if (_lookup === "activity") {
        let cacheData: any = {}
        try {
          //Check in redis cache for activities
          cacheData = await RedisClient?.get(`${researcher_id}_lookup:activities`)
        } catch (error) {}
        console.log("cacheData", cacheData)
        if (null === cacheData || undefined !== studyID || undefined === cacheData) {
          console.log("cache data absent for activities")
          //fetch activities based on study from database
          for (const study of studies) {
            const Activities = await ActivityRepository._lookup(study.id, true)
            for (const activity of Activities) {
              await activities.push({ ...activity, study_name: study.name })
            }
            await study_details.push({ activity_count: Activities.length, study_id: study.id, study_name: study.name })
          }
          if (undefined === studyID) {
            try {
              //add the list of activities  to cache for next 5 mts
              CacheDataQueue?.add({
                key: `${researcher_id}_lookup:activities`,
                payload: { studies: study_details, activities: activities },
              })
            } catch (error) {}
          }
          data = { studies: study_details, activities: activities }
        } else {
          console.log("cache data present for activities")
          const result = JSON.parse(cacheData)
          data = { studies: result.studies, activities: result.activities }
        }
      } else if (_lookup === "sensor") {
        let cacheData: any = {}
        try {
          //Check in redis cache for Sensors
          cacheData = await RedisClient?.get(`${researcher_id}_lookup:sensors`)
        } catch (error) {}

        if (null === cacheData || undefined !== studyID || undefined === cacheData) {
          console.log("cache data absent for sensors")
          //fetch sensors based on study from database
          for (const study of studies) {
            const Sensors = await SensorRepository._lookup(study.id, true)
            for (const sensor of Sensors) {
              await sensors.push({ ...sensor, study_name: study.name })
            }
            await study_details.push({ sensor_count: Sensors.length, study_id: study.id, study_name: study.name })
          }
          if (undefined === studyID) {
            try {
              //add the list of sensors to cache for next 5 mts
              CacheDataQueue?.add({
                key: `${researcher_id}_lookup:sensors`,
                payload: { studies: study_details, sensors: sensors },
              })
            } catch (error) {}
          }
          data = { studies: study_details, sensors: sensors }
        } else {
          console.log("cache data present for sensors")
          const result = JSON.parse(cacheData)
          data = { studies: result.studies, sensors: result.sensors }
        }
      }
      return data
    }
  }

  public static async set(auth: any, researcher_id: string, researcher: any | null) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    if (researcher === null) {
      const data = await ResearcherRepository._delete(researcher_id)

      //publishing data for researcher delete api with token = researcher.{researcher_id}
      PubSubAPIListenerQueue?.add({
        topic: `researcher.*`,
        token: `researcher.${researcher_id}`,
        payload: { action: "delete", researcher_id: researcher_id },
      })
      PubSubAPIListenerQueue?.add({
        topic: `researcher`,
        token: `researcher.${researcher_id}`,
        payload: { action: "delete", researcher_id: researcher_id },
      })
      return data
    } else {
      const data = await ResearcherRepository._update(researcher_id, researcher)

      //publishing data for researcher update api with token = researcher.{researcher_id}
      researcher.action = "update"
      researcher.researcher_id = researcher_id
      PubSubAPIListenerQueue?.add({ topic: `researcher.*`, token: `researcher.${researcher_id}`, payload: researcher })
      PubSubAPIListenerQueue?.add({ topic: `researcher`, token: `researcher.${researcher_id}`, payload: researcher })
      return data
    }
  }
}

ResearcherService.Router.post("/researcher", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ResearcherService.create(req.get("Authorization"), null, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

ResearcherService.Router.put("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ResearcherService.set(req.get("Authorization"), req.params.researcher_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.Router.delete("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await ResearcherService.set(req.get("Authorization"), req.params.researcher_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.Router.get("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await ResearcherService.get(req.get("Authorization"), req.params.researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.Router.get("/researcher", async (req: Request, res: Response) => {
  try {
    let output = { data: await ResearcherService.list(req.get("Authorization"), null) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

/**Researcher lookup -Take studies with either  participant,participantcount OR activities,activitycount OR sensor,sensor count
 * lookup can be  participant, activity, sensor
 * Data cacheing for 5 minutes available( IF studyID is given as query param, take data based on that studyID from db itself (i.e cache is ignored))
 * @param STRING researcher_id
 * @param STRING lookup
 * @return ARRAY
 */
ResearcherService.Router.get("/researcher/:researcher_id/_lookup/:lookup", async (req: Request, res: Response) => {
  try {
    res.json(
      await ResearcherService.get(
        req.get("Authorization"),
        req.params.researcher_id,
        true,
        req.params.lookup,
        (!!req.query.study_id ? req.query.study_id : undefined) as any
      )
    )
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
