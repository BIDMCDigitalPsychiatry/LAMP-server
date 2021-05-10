import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue, UpdateToSchedulerQueue, CacheDataQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"
import { RedisClient } from "../repository/Bootstrap"

export class StudyService {
  public static _name = "Study"
  public static Router = Router()

  public static async list(auth: any, researcher_id: string) {
    const StudyRepository = new Repository().getStudyRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    return await StudyRepository._select(researcher_id, true)
  }

  public static async create(auth: any, researcher_id: string, study: any) {
    const StudyRepository = new Repository().getStudyRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    const data = await StudyRepository._insert(researcher_id, study)

    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    study.researcher_id = researcher_id
    study.study_id = data
    study.action = "create"
    PubSubAPIListenerQueue?.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${data}`,
      payload: study,
    })
    PubSubAPIListenerQueue?.add({
      topic: `researcher.*.study`,
      token: `researcher.${researcher_id}.study.${data}`,
      payload: study,
    })
    return data
  }

  public static async get(auth: any, study_id: string, lookup = false, _lookup?: string, mode?: number) {
    const StudyRepository = new Repository().getStudyRepository()
    study_id = await _verify(auth, ["self", "parent"], study_id)
    if (lookup === false) {
      const data = await StudyRepository._select(study_id)
      return data
    } else {
      let data: {} = {}
      const repo = new Repository()
      const ParticipantRepository = repo.getParticipantRepository()
      const TypeRepository = repo.getTypeRepository()
      const SensorEventRepository = repo.getSensorEventRepository()
      const ActivityEventRepository = repo.getActivityEventRepository()
      const _ = await _verify(auth, ["self", "parent"], study_id)      
      if (_lookup === "participant") {
        const ParticipantIDs = (await ParticipantRepository._select(study_id, true)) as any
        for (let index = 0; index < ParticipantIDs.length; index++) {
          try {
            //Fetch participant's name i.e mode=3 OR 4
            if (mode === 3 || mode === 4) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:name`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].name = result.name
              } else {
                let tags_participant_name = ""
                try {
                  tags_participant_name = await TypeRepository._get("a", ParticipantIDs[index].id, "lamp.name")
                  ParticipantIDs[index].name = tags_participant_name
                  CacheDataQueue?.add({
                    key: `${ParticipantIDs[index].id}:name`,
                    payload: { name: tags_participant_name },
                  })
                } catch (error) {}
              }
            }
          } catch (error) {}
          try {
            //Fetch participant's unity settings i.e mode=3
            if (mode === 3) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:unity_settings`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].unity_settings = result.unity_settings
              } else {
                let tags_participant_unity_setting: {} = {}
                try {
                  tags_participant_unity_setting = await TypeRepository._get(
                    "a",
                    ParticipantIDs[index].id,
                    "to.unityhealth.psychiatry.settings"
                  )
                  ParticipantIDs[index].unity_settings = tags_participant_unity_setting
                  CacheDataQueue?.add({
                    key: `${ParticipantIDs[index].id}:unity_settings`,
                    payload: { unity_settings: tags_participant_unity_setting },
                  })
                } catch (error) {}
              }
            }
          } catch (error) {}
          try {
            //Fetch participant's gps data i.e mode=1
            if (mode === 1) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:gps`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].gps = result.gps
              } else {
                const gps =
                  (await SensorEventRepository._select(
                    ParticipantIDs[index].id,
                    "lamp.gps",
                    undefined,
                    undefined,
                    5
                  )) ??
                  (await SensorEventRepository._select(ParticipantIDs[index].id, "beiwe.gps", undefined, undefined, 5))

                ParticipantIDs[index].gps = gps
                CacheDataQueue?.add({
                  key: `${ParticipantIDs[index].id}:gps`,
                  payload: { gps: gps },
                })
              }
            }
          } catch (error) {}
          try {
            //Fetch participant's accelerometer data i.e mode=1
            if (mode === 1) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:accelerometer`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].accelerometer = result.accelerometer
              } else {
                const accelerometer =
                  (await SensorEventRepository._select(
                    ParticipantIDs[index].id,
                    "lamp.accelerometer",
                    undefined,
                    undefined,
                    5
                  )) ??
                  (await SensorEventRepository._select(
                    ParticipantIDs[index].id,
                    "beiwe.accelerometer",
                    undefined,
                    undefined,
                    5
                  ))

                ParticipantIDs[index].accelerometer = accelerometer
                CacheDataQueue?.add({
                  key: `${ParticipantIDs[index].id}:accelerometer`,
                  payload: { accelerometer: accelerometer },
                })
              }
            }
          } catch (error) {}
          try {
            //Fetch participant's analytics data i.e mode=1
            if (mode === 1) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:analytics`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].analytics = result.analytics
              } else {
                console.log("analytics cache absent")
                const analytics = await SensorEventRepository._select(
                  ParticipantIDs[index].id,
                  "lamp.analytics",
                  undefined,
                  undefined,
                  1
                )
                ParticipantIDs[index].analytics = analytics
                CacheDataQueue?.add({
                  key: `${ParticipantIDs[index].id}:analytics`,
                  payload: { analytics: analytics },
                })
              }
            }
          } catch (error) {}
          try {
            //Fetch participant's active data i.e mode=2
            if (mode === 2) {
              //fetch data from redis if any
              const cacheData = (await RedisClient?.get(`${ParticipantIDs[index].id}:active`)) || null
              if (null !== cacheData) {
                const result = JSON.parse(cacheData)
                ParticipantIDs[index].active = result.active
              } else {
                const active = await ActivityEventRepository._select(
                  ParticipantIDs[index].id,
                  undefined,
                  undefined,
                  undefined,
                  1
                )
                ParticipantIDs[index].active = active
                CacheDataQueue?.add({
                  key: `${ParticipantIDs[index].id}:active`,
                  payload: { active: active },
                })
              }
            }
          } catch (error) {}
        }

        data = { participants: ParticipantIDs }
      }

      return data
    }
  }

  public static async set(auth: any, study_id: string, study: any | null) {
    const StudyRepository = new Repository().getStudyRepository()
    const TypeRepository = new Repository().getTypeRepository()
    study_id = await _verify(auth, ["self", "parent"], study_id)
    if (study === null) {
      let parent = (await TypeRepository._parent(study_id)) as any
      const data = await StudyRepository._delete(study_id)

      //publishing data for study delete api with Token researcher.{researcher_id}.study.{study_id}
      PubSubAPIListenerQueue?.add({
        topic: `study.*`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      PubSubAPIListenerQueue?.add({
        topic: `study`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      PubSubAPIListenerQueue?.add({
        topic: `researcher.*.study`,
        token: `researcher.${parent["Researcher"]}.study.${study_id}`,
        payload: { action: "delete", study_id: study_id, researcher_id: parent["Researcher"] },
      })
      return data
    } else {
      const data = await StudyRepository._update(study_id, study)

      //publishing data for study update api(Token will be created in PubSubAPIListenerQueue consumer, as researcher for this study need to fetched to create token)
      study.study_id = study_id
      study.action = "update"
      PubSubAPIListenerQueue?.add({ topic: `study.*`, payload: study })
      PubSubAPIListenerQueue?.add({ topic: `study`, payload: study })
      PubSubAPIListenerQueue?.add({ topic: `researcher.*.study`, payload: study })
      return data
    }
  }
}

StudyService.Router.post("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.create(req.get("Authorization"), req.params.researcher_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.put("/study/:study_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.set(req.get("Authorization"), req.params.study_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.delete("/study/:study_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await StudyService.set(req.get("Authorization"), req.params.study_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.get("/study/:study_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await StudyService.get(req.get("Authorization"), req.params.study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
StudyService.Router.get("/researcher/:researcher_id/study", async (req: Request, res: Response) => {
  try {
    let output = { data: await StudyService.list(req.get("Authorization"), req.params.researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

// Clone study id to another-import activities,sensors to new studyid given
StudyService.Router.post("/researcher/:researcher_id/study/clone", async (req: Request, res: Response) => {
  try {
    const StudyRepository = new Repository().getStudyRepository()
    const ActivityRepository = new Repository().getActivityRepository()
    const SensorRepository = new Repository().getSensorRepository()
    const ParticipantRepository = new Repository().getParticipantRepository()
    let researcher_id = req.params.researcher_id
    const study = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await StudyRepository._insert(researcher_id, study) }
    let should_add_participant: boolean = req.body.should_add_participant ?? false
    let StudyID: string | undefined =
      req.body.study_id === "" || req.body.study_id === "null" ? undefined : req.body.study_id
    if (!!StudyID) {
      let activities = await ActivityRepository._select(StudyID, true)
      let sensors = await SensorRepository._select(StudyID, true)
      //clone activities  to new studyid
      for (const activity of activities) {
        try {
          let object = {
            name: activity.name,
            spec: activity.spec,
            settings: activity.settings,
            schedule: activity.schedule,
          }
          const res = await ActivityRepository._insert(output["data"], object)
          //add the schedules of new activity
          UpdateToSchedulerQueue?.add({ activity_id: res })
        } catch (error) {}
      }
      //clone sensors  to new studyid
      for (const sensor of sensors) {
        let object = { name: sensor.name, spec: sensor.spec, settings: sensor.settings }
        await SensorRepository._insert(output["data"], object)
      }
    }
    //add participants if participants add flag is true
    if (should_add_participant) {
      await ParticipantRepository._insert(output["data"], {})
    }
    study.researcher_id = researcher_id
    study.study_id = output["data"]
    study.action = "create"
    //publishing data for study add api with token = researcher.{researcher_id}.study.{_id}
    PubSubAPIListenerQueue?.add({
      topic: `study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    PubSubAPIListenerQueue?.add({
      topic: `researcher.*.study`,
      token: `researcher.${researcher_id}.study.${output["data"]}`,
      payload: study,
    })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
/** Study lookup -Take study based participant's tags,activity_events,sensor_events
 * lookup can be  participant only
 * Data cacheing for 5 minutes
 *  @param study_id STRING
 *  @param lookup STRING
 *  @param mode STRING
 *  @return JSON
 *  mode 3- return  lamp.name and to.unityhealth.psychiatry.settings,4-return  lamp.name only
 *  mode 1 - return only gps,accelerometer,analytics, mode 2- return only activity_event data
 */
StudyService.Router.get("/study/:study_id/_lookup/:lookup/mode/:mode", async (req: Request, res: Response) => {
  try {
    let mode: number | undefined = Number.parse(req.params.mode)
    res.json(await StudyService.get(req.get("Authorization"), req.params.study_id, true, req.params.lookup, mode))
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
