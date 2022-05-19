import { Request, Response, Router } from "express"
import { OAuthConfiguration } from "../utils/OAuthConfiguration"
import { _verify } from "./Security"
import fetch, { Request as Req, Response as Res } from "node-fetch"
import { MongoClientDB, Repository } from "../repository/Bootstrap"
import { CredentialService, UpdateTokenResult } from './CredentialService';
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

  let startURL: string
  try {
    startURL = OAuthConfiguration.getStartFlowUrl()
  } catch {
    res.status(500).send("Internal server error")
    return
  }

  res.json({
    url: startURL
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
  let response: Res
  try {
    response = await fetch(request)
  } catch {
    res.status(500).send("Identity provider error")
    return
  }

  let json: any
  try {
    json = await response.json()

    if (!!json.error) {
      throw new Error()
    }
  } catch {
    res.json({
      success: false
    })
    return
  }

  const accessToken = json.access_token
  const refreshToken = json.refresh_token
  const payload = !!accessToken ? decode(accessToken) as any : {}
  if (!payload.email) {
    res
      .status(500)
      .json({ success: false })
    return
  }

  let result: UpdateTokenResult
  try {
    result = await CredentialService.updateToken(payload.email, refreshToken)
  } catch (e) {
    res
      .status(parseInt(e.message.split(".")[0]) || 500)
      .json({
        success: false,
        error: e.message,
      })
    return
  }  
  
  res.json({
    ...result,
    success: true,
  })
})