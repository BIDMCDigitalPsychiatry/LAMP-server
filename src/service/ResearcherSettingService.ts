import { Request, Response, Router } from "express"
import { _verify } from "./Security"
import { Repository, ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { authenticateToken } from "../middlewares/authenticateToken"

export class ResearcherSettingsService {
  public static Router = Router()

  public static async create(auth: any, parent_id: any, researcherData: any, choice?: any) {
    const ResearcherSettingRepository = new Repository().getResearcherSettingRepository()
    const _ = await _verify(auth, [])
    const data = await ResearcherSettingRepository._insert(parent_id, researcherData, choice)

    return data
  }

  public static async get(auth: any, type: string, id: string) {
    const ResearcherSettingRepository = new Repository().getResearcherSettingRepository()
    const response: any = await _verify(auth, ["self", "parent"], id)
    if (response.id === null) {
      return await ResearcherSettingRepository._select(type, id)
    }
    return await ResearcherSettingRepository._select(type, response.id)
  }
  public static async list(auth: any, participantid: string) {
    const ResearcherSettingRepository = new Repository().getResearcherSettingRepository()
    const response: any = await _verify(auth, ["self", "parent"], participantid)

    if (response.id === null) {
      return await ResearcherSettingRepository._get(participantid)
    }
    return await ResearcherSettingRepository._get(response.id)
  }
}

ResearcherSettingsService.Router.post(
  "/researcherSettings/:researcher_id",
  authenticateToken,

  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await ResearcherSettingsService.create(
          req.get("Authorization"),
          req.params.researcher_id,
          req.body,
          req.query.choice
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

ResearcherSettingsService.Router.get(
  "/researcherSettings/:type/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await ResearcherSettingsService.get(req.get("Authorization"), req.params.type, req.params.id),
      }

      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

ResearcherSettingsService.Router.get(
  "/participant/researcherSettings/:participantid",
  authenticateToken,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = { data: await ResearcherSettingsService.list(req.get("Authorization"), req.params.participantid) }

      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
