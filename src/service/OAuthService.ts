import { Request, Response, Router } from "express"
import { _verify } from "./Security"

export class OAuthService {
  public static _name = "OAuth"
  public static Router = Router()
}

OAuthService.Router.get("/oauth/start", async (req: Request, res: Response) => {
  res.redirect("https://google.com")
})