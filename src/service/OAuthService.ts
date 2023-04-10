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

  let loginURL = OAuthConfiguration.loginUrl
  if (!loginURL) {
    res.status(500).send("Internal server errror")
    return
  }

  let logoutURL = OAuthConfiguration.getLogoutURL()

  console.log(`[OAuth] loginURL: ${loginURL}, logoutURL: ${logoutURL}`)

  res.json({
    loginURL,
    logoutURL,
  })
})

OAuthService.Router.post("/oauth/authenticate", async (req: Request, res: Response) => {
  let code = req.body.code
  let verifier = req.body.code_verifier

  if (!code || !verifier) {
    console.log("[OAuth] Invalid authentication parameters")
    console.log(`[OAuth] code: ${code != undefined}, code_verifier: ${verifier != undefined}`)
    res.status(400).send("Invalid parameters")
    return
  }

  console.log(`[OAuth] code length: ${code.length}, code_verifier length: ${verifier.length}`)

  let request = OAuthConfiguration.getRedeemCodeRequest(code, verifier)

  console.log("[OAuth] About to perform redeem code request")

  fetch(request).then(async response => {
      console.log(`[OAuth] Redeem code response status: ${response.status}`)
      console.log(`[OAuth] Redeem code response statusText: ${response.statusText}`)
      console.log(`[OAuth] Redeem code response ok: ${response.ok}`)
      console.log(`[OAuth] Redeem code response redirected: ${response.redirected}`)
      console.log(`[OAuth] Redeem code response timeout: ${response.timeout}`)
      console.log(`[OAuth] Redeem code response type: ${response.type}`)
      console.log(`[OAuth] Redeem code response url: ${response.url}`)

      let json: any
      try {
        json = await response.json()
      } catch (error) {
        console.log(`[OAUth] Redeem code response parse error: ${error}`)
        console.log(`[OAuth] Redeem code response body: ${await response.text()}`)
        throw error
      }

      console.log(`[OAUth] Redeem code response parse successful`)
      console.log(`[OAuth] Redeem code response has access_token: ${json.hasOwnProperty("access_token")}, refresh_token: ${json.hasOwnProperty("refresh_token")}`)
      console.log(`[OAuth] Redeem code response error: ${json.error}`)

      if(json.error) {
        res.status(500).send(json.error)
        return
      }

      const idp_accessToken = json.id_token ? json.id_token : json.access_token
      const idp_refresh_token = json.refresh_token

      console.log("[OAuth] About to decode IdP access token", idp_accessToken)

      let payload: any
      try {
        payload = decode(idp_accessToken) as any
      } catch (error) {
        console.log(`[OAuth] IdP access token could not be decoded: ${error}`)
        throw error
      }

      if (!payload) {
        throw new Error("[OAuth] IdP access token is null");
      }
      
      console.log(`[OAuth] Redeem code response payload:`, payload)

      let email = payload.email
      if(!email) email = payload.emails?.[0]
      if(!email) email = payload.sub
      if(!email) {
        res.status(400).send("No email found")
        return
      }

      let result: any
      try {
        result = await CredentialService.updateToken(email, idp_refresh_token)
      } catch (error) {
        console.log(`[OAuth] Update token error: ${error}`)
        throw error
      }
      console.log(`[OAuth] Update token success: ${result.success}`)
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