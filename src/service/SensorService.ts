import { Request, Response, Router } from "express"
import { _verify } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { PubSubAPIListenerQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

export class SensorService {
  public static _name = "Sensor"
  public static Router = Router()
  
  public static async list(auth: any, study_id: string, ignore_binary: boolean, sibling: boolean = false) {
    const SensorRepository = new Repository().getSensorRepository()
    const TypeRepository = new Repository().getTypeRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
    if (sibling) {
      const parent_id = await TypeRepository._owner(study_id)
      if (parent_id === null) throw new Error("403.invalid-sibling-ownership")
      else study_id = parent_id
    }
    return await SensorRepository._select(study_id, true, ignore_binary)
  }

  public static async create(auth: any, study_id: string, sensor: any) {
    const SensorRepository = new Repository().getSensorRepository()
    study_id = await _verify(auth, ["self", "sibling", "parent"], study_id)
    const data = await SensorRepository._insert(study_id, sensor)

    //publishing data for sensor add api with token = study.{study_id}.sensor.{_id}
    sensor.study_id = study_id
    sensor.action = "create"
    sensor.sensor_id = data
    PubSubAPIListenerQueue?.add({
      topic: `sensor`,
      token: `study.${study_id}.sensor.${data}`,
      payload: sensor,
    })
    PubSubAPIListenerQueue?.add({
      topic: `study.*.sensor`,
      token: `study.${study_id}.sensor.${data}`,
      payload: sensor,
    })
    return data
  }

  public static async get(auth: any, sensor_id: string) {
    const SensorRepository = new Repository().getSensorRepository()
    sensor_id = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
    return await SensorRepository._select(sensor_id)
  }

  public static async set(auth: any, sensor_id: string, sensor: any | null) {
    const SensorRepository = new Repository().getSensorRepository()
    const TypeRepository = new Repository().getTypeRepository()
    sensor_id = await _verify(auth, ["self", "sibling", "parent"], sensor_id)
    if (sensor === null) {
      //find the study id before delete, as it cannot be fetched after delete
      const parent = await TypeRepository._parent(sensor_id) as any
      const data = await SensorRepository._delete(sensor_id)

      //publishing data for participant delete api for the Token study.{study_id}.sensor.{sensor_id}
      if (parent !== undefined && parent !== "") {
        PubSubAPIListenerQueue?.add({
          topic: `study.*.sensor`,
          token: `study.${parent["Study"]}.sensor.${sensor_id}`,
          payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
        })
        PubSubAPIListenerQueue?.add({
          topic: `sensor.*`,
          token: `study.${parent["Study"]}.sensor.${sensor_id}`,
          payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
        })
        PubSubAPIListenerQueue?.add({
          topic: `sensor`,
          token: `study.${parent["Study"]}.sensor.${sensor_id}`,
          payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
        })
      }
      return data
    } else {
      const data = await SensorRepository._update(sensor_id, sensor)

      //publishing data for sensor update api (Token will be created in PubSubAPIListenerQueue? consumer, as study for this sensor need to fetched to create token)
      sensor.sensor_id = sensor_id
      sensor.action = "update"
      PubSubAPIListenerQueue?.add({ topic: `sensor.*`, payload: sensor })
      PubSubAPIListenerQueue?.add({ topic: `sensor`, payload: sensor })
      PubSubAPIListenerQueue?.add({ topic: `study.*.sensor`, payload: sensor })
      return data
    }
  }
}

SensorService.Router.post("/study/:study_id/sensor", async (req: Request, res: Response) => {
  try {
    res.json({ data: await SensorService.create(req.get("Authorization"), req.params.study_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.Router.put("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await SensorService.create(req.get("Authorization"), req.params.sensor_id, req.body) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.Router.delete("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    res.json({ data: await SensorService.set(req.get("Authorization"), req.params.sensor_id, null) })
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.Router.get("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    let output = { data: await SensorService.get(req.get("Authorization"), req.params.sensor_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.Router.get("/participant/:participant_id/sensor", async (req: Request, res: Response) => {
  try {
    let output = { data: await SensorService.list(req.get("Authorization"), req.params.participant_id, req.query.ignore_binary === "true", true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.Router.get("/study/:study_id/sensor", async (req: Request, res: Response) => {
  try {
    let output = { data: await SensorService.list(req.get("Authorization"), req.params.study_id, req.query.ignore_binary === "true") }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
