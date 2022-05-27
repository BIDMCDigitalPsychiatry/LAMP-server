import { Request, Response, Router } from "express"
import { OAuthConfiguration } from "../utils/OAuthConfiguration"
import { _verify } from "./Security"
import fetch, { Request as Req, Response as Res } from "node-fetch"
import { CredentialService } from './CredentialService';
import { decode } from "jsonwebtoken"

export class OAuthService {
  public static _name = "OAuth"
  public static Router = Router()
}

OAuthService.Router.get("/oauth/start", async (req: Request, res: Response) => {
  if (!OAuthConfiguration.isEnabled) {
    res
      .status(404)
      .json({ message: "404.oauth-disabled" })
    return
  }

  let loginURL = OAuthConfiguration.getLoginURL()
  if (!loginURL) {
    res.status(500).send("Internal server errror")
    return
  }

  let logoutURL = OAuthConfiguration.getLogoutURL()

  res.json({
    loginURL,
    logoutURL,
  })
})

OAuthService.Router.post("/oauth/authenticate", async (req: Request, res: Response) => {
  let code = req.body.code
  let verifier = req.body.code_verifier

  if (!code || !verifier) {
    res.status(400).send("Invalid parameters")
    return
  }

  let request = OAuthConfiguration.getRedeemCodeRequest(code, verifier)

  fetch(request).then(async response => {
      let json = await response.json()
      if(json.error) {
        res.status(500).send(json.error)
        return
      }

      const idp_accessToken = json.access_token
      const idp_refresh_token = json.refresh_token
      const payload = decode(idp_accessToken) as any

      let email = payload.email
      if(!email) email = payload.emails[0]
      if(!email) {
        res.status(400).send("No email found")
        return
      }

      let result = await CredentialService.updateToken(email, idp_refresh_token)
      if (!result.success) {
        res.status(401).send("Unauthorized")
        return
      }
      res.json({
        ...result,
        success: true
      })
  })
})