import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

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
    PubSubAPIListenerQueue?.add(
      { topic: `researcher`, token: `researcher.${data}`, payload: researcher },
      {
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
    return data
  }

  public static async get(auth: any, researcher_id: string) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    researcher_id = await _verify(auth, ["self", "parent"], researcher_id)
    return await ResearcherRepository._select(researcher_id)
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
      PubSubAPIListenerQueue?.add(
        {
          topic: `researcher`,
          token: `researcher.${researcher_id}`,
          payload: { action: "delete", researcher_id: researcher_id },
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      return data
    } else {
      const data = await ResearcherRepository._update(researcher_id, researcher)

      //publishing data for researcher update api with token = researcher.{researcher_id}
      researcher.action = "update"
      researcher.researcher_id = researcher_id
      PubSubAPIListenerQueue?.add(
        { topic: `researcher.*`, token: `researcher.${researcher_id}`, payload: researcher },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      PubSubAPIListenerQueue?.add(
        { topic: `researcher`, token: `researcher.${researcher_id}`, payload: researcher },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
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
    const _lookup: string = req.params.lookup
    const studyID: string = (!!req.query.study_id ? req.query.study_id : undefined) as any
    let researcher_id: string = req.params.researcher_id
    const _ = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    //PREPARE DATA FROM DATABASE
    let activities: object[] = []
    let sensors: object[] = []
    let study_details: object[] = []
    const repo = new Repository()
    const ActivityRepository = repo.getActivityRepository()
    const SensorRepository = repo.getSensorRepository()
    const StudyRepository = repo.getStudyRepository()
    const ParticipantRepository = repo.getParticipantRepository()
    const TypeRepository = repo.getTypeRepository()
    //Fetch Studies
    const studies = !!studyID
      ? ((await StudyRepository._select(studyID, false)) as any)
      : ((await StudyRepository._select(researcher_id, true)) as any)
    if (_lookup === "participant") {
      let tags = false
      try {
        //fetch participants based on study and researcher tags  from database
        tags = await TypeRepository._get("a", <string>researcher_id, "to.unityhealth.psychiatry.enabled")
      } catch (error) {}
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
      res.json({ studies: study_details, unityhealth_settings: tags })
    } else if (_lookup === "activity") {
      //fetch activities based on study from database
      for (const study of studies) {
        const Activities = await ActivityRepository._lookup(study.id, true)
        for (const activity of Activities) {
          await activities.push({ ...activity, study_name: study.name })
        }
        await study_details.push({ activity_count: Activities.length, study_id: study.id, study_name: study.name })
      }
      res.json({ studies: study_details, activities: activities })
    } else if (_lookup === "sensor") {
      //fetch sensors based on study from database
      for (const study of studies) {
        const Sensors = await SensorRepository._lookup(study.id, true)
        for (const sensor of Sensors) {
          await sensors.push({ ...sensor, study_name: study.name })
        }
        await study_details.push({ sensor_count: Sensors.length, study_id: study.id, study_name: study.name })
      }
      res.json({ studies: study_details, sensors: sensors })
    }
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
ResearcherService.Router.get("/study/:study_id/_lookup/:lookup/mode/:mode", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ParticipantRepository = repo.getParticipantRepository()
    const TypeRepository = repo.getTypeRepository()
    const SensorEventRepository = repo.getSensorEventRepository()
    const ActivityEventRepository = repo.getActivityEventRepository()
    let studyID: string = req.params.study_id
    const _ = await _verify(req.get("Authorization"), ["self", "parent"], studyID)
    let lookup: string = req.params.lookup
    let mode: number | undefined = Number.parse(req.params.mode)
    //IF THE LOOK UP IS PARTICIPANT
    if (lookup === "participant") {
      const ParticipantIDs = (await ParticipantRepository._select(studyID, true)) as any
      for (let index = 0; index < ParticipantIDs.length; index++) {
        try {
          //Fetch participant's name i.e mode=3 OR 4
          if (mode === 3 || mode === 4) {
            let tags_participant_name = ""
            try {
              tags_participant_name = await TypeRepository._get("a", ParticipantIDs[index].id, "lamp.name")
              ParticipantIDs[index].name = tags_participant_name
            } catch (error) {}
          }
        } catch (error) {}
        try {
          //Fetch participant's unity settings i.e mode=3
          if (mode === 3) {
            let tags_participant_unity_setting: {} = {}
            try {
              tags_participant_unity_setting = await TypeRepository._get(
                "a",
                ParticipantIDs[index].id,
                "to.unityhealth.psychiatry.settings"
              )
              ParticipantIDs[index].unity_settings = tags_participant_unity_setting
            } catch (error) {}
          }
        } catch (error) {}
        try {
          //Fetch participant's gps data i.e mode=1
          if (mode === 1) {
            const gps =
              (await SensorEventRepository._select(ParticipantIDs[index].id, "lamp.gps", undefined, undefined, 5)) ??
              (await SensorEventRepository._select(ParticipantIDs[index].id, "beiwe.gps", undefined, undefined, 5))

            ParticipantIDs[index].gps = gps
          }
        } catch (error) {}
        try {
          //Fetch participant's accelerometer data i.e mode=1
          if (mode === 1) {
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
          }
        } catch (error) {}
        try {
          //Fetch participant's analytics data i.e mode=1
          if (mode === 1) {
            const analytics = await SensorEventRepository._select(
              ParticipantIDs[index].id,
              "lamp.analytics",
              undefined,
              undefined,
              1
            )
            ParticipantIDs[index].analytics = analytics
          }
        } catch (error) {}
        try {
          //Fetch participant's active data i.e mode=2
          if (mode === 2) {
            const active = await ActivityEventRepository._select(
              ParticipantIDs[index].id,
              undefined,
              undefined,
              undefined,
              1
            )
            ParticipantIDs[index].active = active
          }
        } catch (error) {}
      }

      res.json({ participants: ParticipantIDs })
    }
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
