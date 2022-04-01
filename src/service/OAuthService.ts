import { Request, Response, Router } from "express"
import { OauthConfiguration } from "../utils/OauthConfiguration"
import { _verify } from "./Security"
import fetch from "node-fetch"
export class OAuthService {
  public static _name = "OAuth"
  public static Router = Router()
}

OAuthService.Router.get("/oauth/start", async (req: Request, res: Response) => {
  const startURL = new OauthConfiguration().getStartFlowUrl()
  res.json({
    "url": startURL
  })
})

OAuthService.Router.post("/oauth/authenticate", async (req: Request, res: Response) => {
  let code = req.body.code
  let verifier = req.body.code_verifier

  let data = new OauthConfiguration().getRedeemTokenData(code, verifier)
  let response = await fetch(data.url, {
    method: "POST",
    body: data.body
  })

  response.json().then(json => {
    if(!!json.error) {
      res.json({
        "success": false
      })
    } else {
      res.json({
        "success": true,
      })
    }
  })
  .catch(() => {
    res.json({
      "success": false
    })
  })
})