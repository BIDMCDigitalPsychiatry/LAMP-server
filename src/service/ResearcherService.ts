import { Request, Response, Router } from "express"
import { Researcher } from "../model/Researcher"
import { SecurityContext, ActionContext, _verify } from "./Security"
import jsonata from "jsonata"
import { PubSubAPIListenerQueue } from "../utils/queue/PubSubAPIListenerQueue"
import { Repository } from "../repository/Bootstrap"

export const ResearcherService = Router()
ResearcherService.post("/researcher", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ResearcherRepository = repo.getResearcherRepository()
    const researcher = req.body

    const _ = await _verify(req.get("Authorization"), [])
    const output = { data: await ResearcherRepository._insert(researcher) }
    researcher.action = "create"
    researcher.researcher_id = output["data"]

    //publishing data for researcher add api with token = researcher.{_id}
    PubSubAPIListenerQueue.add({ topic: `researcher`, token: `researcher.${output["data"]}`, payload: researcher })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

ResearcherService.put("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ResearcherRepository = repo.getResearcherRepository()
    let researcher_id = req.params.researcher_id
    const researcher = req.body
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await ResearcherRepository._update(researcher_id, researcher) }
    researcher.action = "update"
    researcher.researcher_id = researcher_id

    //publishing data for researcher update api with token = researcher.{researcher_id}
    PubSubAPIListenerQueue.add({ topic: `researcher.*`, token: `researcher.${researcher_id}`, payload: researcher })
    PubSubAPIListenerQueue.add({ topic: `researcher`, token: `researcher.${researcher_id}`, payload: researcher })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.delete("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ResearcherRepository = repo.getResearcherRepository()
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    const output = { data: await ResearcherRepository._delete(researcher_id) }

    //publishing data for researcher delete api with token = researcher.{researcher_id}
    PubSubAPIListenerQueue.add({
      topic: `researcher.*`,
      token: `researcher.${researcher_id}`,
      payload: { action: "delete", researcher_id: researcher_id },
    })
    PubSubAPIListenerQueue.add({
      topic: `researcher`,
      token: `researcher.${researcher_id}`,
      payload: { action: "delete", researcher_id: researcher_id },
    })
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.get("/researcher/:researcher_id", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ResearcherRepository = repo.getResearcherRepository()
    let researcher_id = req.params.researcher_id
    researcher_id = await _verify(req.get("Authorization"), ["self", "parent"], researcher_id)
    let output = { data: await ResearcherRepository._select(researcher_id) }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
ResearcherService.get("/researcher", async (req: Request, res: Response) => {
  try {
    const repo = new Repository()
    const ResearcherRepository = repo.getResearcherRepository()
    const _ = await _verify(req.get("Authorization"), [])
    let output = { data: await ResearcherRepository._select() }
    output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output
    res.json(output)
  } catch (e) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})
