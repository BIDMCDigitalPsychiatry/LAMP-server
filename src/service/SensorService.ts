import { Request, Response, Router } from "express"
import { Sensor } from "../model/Sensor"
import { SensorRepository } from "../repository/SensorRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { TypeRepository } from "../repository"
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"

export const SensorService = Router()
SensorService.post("/study/:study_id/sensor", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const sensor = req.body
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    const output = { data: await SensorRepository._insert(study_id, sensor) }
    sensor.study_id = study_id
    sensor.action = "create"

    //publishing data
    PubSubAPIListenerQueue.add({ topic: `sensor`, token: `study.*.sensor.*`, payload: sensor })
    PubSubAPIListenerQueue.add({ topic: `study.*.sensor`, token: `study.${study_id}.sensor.*`, payload: sensor })

    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.put("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    let sensor_id = req.params.sensor_id
    const sensor = req.body
    sensor_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], sensor_id)
    const output = { data: await SensorRepository._update(sensor_id, sensor) }
    sensor.sensor_id = sensor_id
    sensor.action = "update"

    //publishing data
    PubSubAPIListenerQueue.add({ topic: `sensor.*`, payload: sensor })
    PubSubAPIListenerQueue.add({ topic: `sensor`, token: `study.*.sensor.*`, payload: sensor })
    PubSubAPIListenerQueue.add({ topic: `study.*.sensor`, payload: sensor })

    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.delete("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    let sensor_id = req.params.sensor_id
    let parent: any = ""
    try {
      parent = await TypeRepository._parent(sensor_id)
    } catch (error) {
      console.log("Error fetching Study")
    }
    sensor_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], sensor_id)
    const output = { data: await SensorRepository._delete(sensor_id) }

    //publishing data
    if (parent !== undefined && parent !== "") {
      PubSubAPIListenerQueue.add({
        topic: `study.*.sensor`,
        token: `study.${parent["Study"]}.sensor.*`,
        payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
      })

      PubSubAPIListenerQueue.add({
        topic: `sensor.*`,
        token: `study.${parent["Study"]}.sensor.${sensor_id}`,
        payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
      })

      PubSubAPIListenerQueue.add({
        topic: `sensor`,
        token: `study.*.sensor.*`,
        payload: { action: "delete", sensor_id: sensor_id, study_id: parent["Study"] },
      })
    }
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.get("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    let sensor_id = req.params.sensor_id
    sensor_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], sensor_id)
    let output = { data: await SensorRepository._select(sensor_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.get("/participant/:participant_id/sensor", async (req: Request, res: Response) => {
  try {
    let participant_id = req.params.participant_id
    participant_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], participant_id)
    let study_id = await TypeRepository._owner(participant_id)
    if (study_id === null) throw new Error("403.invalid-sibling-ownership")
    let output = { data: await SensorRepository._select(study_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.get("/study/:study_id/sensor", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    let output = { data: await SensorRepository._select(study_id, true) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
