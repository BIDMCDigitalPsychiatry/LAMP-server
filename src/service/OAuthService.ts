import { Request, Response, Router } from "express"
import { OauthConfiguration } from "../utils/OauthConfiguration"
import { _verify } from "./Security"
import fetch from "node-fetch"
import jwt_decode from "jwt-decode"
import { MongoClientDB, Repository } from "../repository/Bootstrap"

export class OAuthService {
  public static _name = "OAuth"
  public static Router = Router()
}

OAuthService.Router.get("/oauth/start", async (req: Request, res: Response) => {
  const configuration = new OauthConfiguration()

  if (!configuration.isEnabled) {
    res
      .status(404)
      .json({ message: "404.oauth-disabled" })
    return
  }

  const startURL = configuration.getStartFlowUrl()
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

  response.json().then(async json => {
    if(!!json.error) {
      res.json({
        "success": false
      })
    } else {
      let accessToken = json.access_token
      let refreshToken = json.refresh_token
      let email = jwt_decode<any>(accessToken).email
      let repository = new Repository().getCredentialRepository()
      let success = await repository._updateOAuth(email, accessToken, refreshToken)

      res.json({
        "success": success,
        "access_token": success ? accessToken : null,
        "refresh_token": success ? refreshToken : null
      })
    }
  }).catch(() => {
    res.json({
      "success": false
    })
  })

})