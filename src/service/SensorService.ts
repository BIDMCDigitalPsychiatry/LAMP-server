import { Request, Response, Router } from "express"
import { Sensor } from "../model/Sensor"
import { SensorRepository } from "../repository/SensorRepository"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"

export const SensorService = Router()
SensorService.post("/study/:study_id/sensor", async (req: Request, res: Response) => {
  try {
    let study_id = req.params.study_id
    const sensor = req.body
    study_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], study_id)
    const output = { data: await SensorRepository._insert(study_id, sensor) }
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
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.delete("/sensor/:sensor_id", async (req: Request, res: Response) => {
  try {
    let sensor_id = req.params.sensor_id
    sensor_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], sensor_id)
    const output = { data: await SensorRepository._delete(sensor_id) }
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
    let output = { data: await SensorRepository._select(participant_id) }
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
    let output = { data: await SensorRepository._select(study_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.get("/researcher/:researcher_id/sensor", async (req: Request, res: Response) => {
  try {
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "sibling", "parent"], researcher_id)
    let output = { data: await SensorRepository._select(researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
SensorService.get("/sensor", async (req: Request, res: Response) => {
  try {
    const _ = await _verify(req.get("Authorization"), ["parent"])
    let output = { data: await SensorRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
