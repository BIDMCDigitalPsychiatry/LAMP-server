import { Request, Response, Router } from "express"
import { OauthConfiguration } from "../utils/OauthConfiguration"
import { _verify } from "./Security"

export class OAuthService {
  public static _name = "OAuth"
  public static Router = Router()
}

OAuthService.Router.get("/oauth/start", async (req: Request, res: Response) => {
  const startURL = new OauthConfiguration().getStartFlowUrl()
  res.redirect(startURL)
})