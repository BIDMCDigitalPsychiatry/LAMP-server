import { Request, response, Response, Router } from "express"
import { _authorize, ApiKeyAccessLevels } from "./Security"
const jsonata = require("../utils/jsonata") // FIXME: REPLACE THIS LATER WHEN THE PACKAGE IS FIXED
import { Repository, ApiResponseHeaders } from "../repository/Bootstrap"
const { credentialValidationRules } = require("../validator/validationRules")
const { validateRequest } = require("../middlewares/validateRequest")
import { ActingUserContext, authenticateSession, AuthFlag, configureAuth } from "../middlewares/authenticateSession"
import { auth, convertSetCookieToCookie, Session } from "../utils/auth"
import { OneTimeTokenRequestFlows, SetupStates } from "../utils/accountSecurityUtilities"
import { fromNodeHeaders } from "better-auth/node"

export class CredentialService {
  public static _name = "Credential"
  public static Router = Router()

  public static async list(actingUserContext: ActingUserContext, type_id: string | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], type_id, ApiKeyAccessLevels.STANDARD)
    return await CredentialRepository._select(type_id)
  }

  public static async create(actingUserContext: ActingUserContext, type_id: string | null, credential: any) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const TypeRepository = new Repository().getTypeRepository()

    await _authorize(actingUserContext, ["self", "parent"], type_id, ApiKeyAccessLevels.SYSTEM_ADMIN)
    
    let newUserType
    if (credential.origin === null) {
      newUserType = "admin"
    } else {
      const originType = await (await TypeRepository._self_type(credential.origin)).toLowerCase()
      if (originType === "researcher") {
        newUserType = "researcher"
      } else if (originType === "participant") {
        newUserType = "participant"
      } else {
        throw new Error("400.invalid-origin")
      }
    }
    let newAccountSetupState = newUserType === "participant" ? SetupStates.NOT_REQUIRED : SetupStates.INCOMPLETE

    return await CredentialRepository._insert(
      type_id, 
      {...credential, user_type: newUserType,
       account_setup_state: newAccountSetupState})
  }

  public static async get(actingUserContext: ActingUserContext, type_id: string | null, access_key: string) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response: any = await _authorize(actingUserContext, ["self", "parent"], type_id, ApiKeyAccessLevels.STANDARD)
    let all = await CredentialRepository._select(type_id)
    return all.filter((x) => x.access_key === access_key)
  }

  public static async set(actingUserContext: ActingUserContext, type_id: string | null, access_key: string, credential: any | null) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const response = await _authorize(actingUserContext, ["self", "parent"], type_id, ApiKeyAccessLevels.SYSTEM_ADMIN)
    if (credential === null) {
      return await CredentialRepository._delete(type_id, access_key)
    } else {
      return await CredentialRepository._update(type_id, access_key, credential)
    }
  }

  public static async verify(accessKey: string | null, secretKey: string) {
    const CredentialRepository = new Repository().getCredentialRepository()
    const TypeRepository = new Repository().getTypeRepository()
    const ResearcherRepository = new Repository().getResearcherRepository()
    const ParticipantRepository = new Repository().getParticipantRepository()

    // Log user in
    // Failure to log in throws an error
    const {headers, response} = await CredentialRepository._login(accessKey, secretKey)

    // Get session data for newly logged in user
    const getSessionHeaders = new Headers()
    getSessionHeaders.set("cookie", convertSetCookieToCookie(headers))
    // We can safely call the wrap auth.api.getSession function because 
    // we have just created the session
    const session = await auth.api.getSession({headers: getSessionHeaders})

    // Create response
    const responseBody = session ? await this.getLoginResponse(session) : ({} as any)
    
    // Add mobile auth token to the response
    const mobileAuthToken = (await auth.api.getToken({headers:getSessionHeaders})).token
    const mobileRefreshToken = (await auth.api.createRefreshToken({
      body: {token: mobileAuthToken}, headers: getSessionHeaders})).refreshToken
    responseBody.mobileAuth = {
      accessToken: mobileAuthToken,
      refreshToken: mobileRefreshToken
    }
    
    return {headers: headers, response: responseBody}
  }

  public static async logOut(session: Session["session"] | null) {
    if (session) {
      const CredentialRepository = new Repository().getCredentialRepository()
      const res = await CredentialRepository._logout(session.token)
    } else {
      throw new Error("403.no-session-provided") 
    }
  }

  public static async getLoginResponse(session:Session) {
    const ResearcherRepository = new Repository().getResearcherRepository()
    const ParticipantRepository = new Repository().getParticipantRepository()

    // Retrieve the user type, and their origin object if it exists
    const userType = session?.user.userType

    let meObject
    if (!session?.user.origin) {
      meObject = null
    } else if (userType === "researcher") {
      meObject = await ResearcherRepository._select(session?.user.origin)
    } else if (userType === "participant") {
      meObject = await ParticipantRepository._select(session?.user.origin)
    } else {
      throw new Error("403.no-session-data")
    }
    
    return {
      accessKey: session?.user.displayUsername || session?.user.email,
      userType: session.user.userType,
      me: meObject?.length ? meObject[0] : null,
      require2FAVerification: session.session.require2FAVerification,
      accountSetupState: session.user.accountSetupState,
    }
  }
}

CredentialService.Router.post(
  "/credential/clear-account-setup",
  authenticateSession,
  async (req, res) => {
    try {
      const {type_id, access_key} = req.body
      if (type_id === undefined || access_key === undefined) {
        res.status(400)
        res.json({error: "400.invalid-credential"})
        return
      }
      const CredentialRepository = new Repository().getCredentialRepository()
      await _authorize(res.locals.actingUserContext, ["self", "parent"], req.body.type_id, ApiKeyAccessLevels.NONE)
      
      const matchingCredentials = (await CredentialRepository._select(req.body.type_id)).filter((credential) => credential.access_key === req.body.access_key)
      if (matchingCredentials.length !== 1) {
        throw new Error("404.no-matching-credentials")
      }
      const credential = matchingCredentials[0]

      const clearSetupResult = await auth.api.clearAccountConfiguration({
        body: {accessKey: credential.access_key},
        headers: fromNodeHeaders(req.headers),
      })
      res.json(clearSetupResult)
    } catch (e:any) {
      if (e?.message) {
        res.status(401)
        res.json({error: e.message})
      } else {
        res.status(500)
        res.json({error: "500.clear-account-setup-failed"})
      }
    }
  }
)

CredentialService.Router.get(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential`),
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      let output = {
        data: await CredentialService.list(
          res.locals.actingUserContext,
          req.params.type_id === "null" ? null : req.params.type_id
        ),
      }
      output = typeof req.query.transform === "string" ? jsonata(req.query.transform).evaluate(output) : output

      res.json(output)
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.post(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map((type) => `/${type}/:type_id/credential/`),
  authenticateSession,
  credentialValidationRules(),
  validateRequest,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)

    try {
      res.json({
        data: await CredentialService.create(
          res.locals.actingUserContext,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.body
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.put(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  authenticateSession,
  validateRequest,
  async (req: Request, res: Response) => {

    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          res.locals.actingUserContext,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          req.body
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)
CredentialService.Router.delete(
  ["researcher", "study", "participant", "activity", "sensor", "type"].map(
    (type) => `/${type}/:type_id/credential/:access_key`
  ),
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      res.json({
        data: await CredentialService.set(
          res.locals.actingUserContext,
          req.params.type_id === "null" ? null : req.params.type_id,
          req.params.access_key,
          null
        ),
      })
    } catch (e: any) {
      if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
      res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
    }
  }
)

CredentialService.Router.post(`/login`, async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    const verifyResult = await CredentialService.verify(req.body.accessKey, req.body.secretKey)

    // We must manually set the session cookie by copying the entire header value as the cookie is signed by better auth
    // This must be the first cookie added to the response
    res.setHeader("Set-Cookie", verifyResult.headers.get("set-cookie"));

    return res.json(verifyResult.response)  // TODO: Fine tune the desired response from this
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)  // TODO: Pull out these basic auth things
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})

CredentialService.Router.post(
  "/logout", 
  configureAuth([AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req: Request, res: Response) => {
  res.header(ApiResponseHeaders)
  try {
    res.json({
      data: await CredentialService.logOut(res.locals.actingUserContext.session),
    })
  } catch (e: any) {
    if (e.message === "401.missing-credentials") res.set("WWW-Authenticate", `Basic realm="LAMP" charset="UTF-8"`)
    res.status(parseInt(e.message.split(".")[0]) || 500).json({ error: e.message })
  }
})



// OAuth Login
CredentialService.Router.post(
  "/login/:socialProvider", 
  async (req, res) => {
    // TODO: Check that this socialProvider is configured
    const loginResult = await auth.api.signInSocial({
      method: "POST",
      body: {
        provider: req.params.socialProvider,
        additionalData: {
          isSignUp: false
        }
      },
      asResponse: true
    })
    const resultBody = await loginResult.json()
    res.setHeader("set-cookie", loginResult.headers.get("set-cookie") as string)
    res.json({redirectUrl: resultBody.url})
  }
)

CredentialService.Router.get(
  "/login/:socialProvider/callback",
  async (req, res) => {
    const callbackResult = await auth.api.callbackOAuth({
      method: "GET",
      query: req.query,
      params: {id: req.params.socialProvider},
      headers: fromNodeHeaders(req.headers),
      asResponse: true
    })
    const redirectUrl = new URL(process.env.DASHBOARD_URL as string)

    if (callbackResult.status === 302) {
      // Check for error message in the returned redirect URL
      let locationUrlString = callbackResult.headers.get("location")
      if (!!locationUrlString) {
        const locationUrl = new URL(locationUrlString)
        const error = locationUrl.searchParams.get("error")
        if (error) {
          let errorMessage = ""
          if (error === "email_doesn't_match") {
            errorMessage = "Unable to link account to authentication provider. Make sure the emails on both of your accounts match."
          } else {
            errorMessage = "Unable to link account to authentication provider."
            errorMessage = error
          }
          redirectUrl.searchParams.append("error", errorMessage)
          res.redirect(redirectUrl.toString())
          return
        }
      }

      // If there were no errors create a one time token and send it to the client
      if (callbackResult.headers.getSetCookie().length) {
        const newHeaders = new Headers()
        newHeaders.set("cookie", convertSetCookieToCookie(callbackResult.headers))
        const finishLoginToken = await auth.api.generateOneTimeToken({
          method: "GET",
          headers: newHeaders,
          asResponse: true,
          query: {
            oneTimeTokenRequestFlow: OneTimeTokenRequestFlows.OAUTH
          }
        })
        if (finishLoginToken.status === 200) {
          const finishLoginTokenBody = await finishLoginToken.json()
          redirectUrl.searchParams.append("finishLoginToken", finishLoginTokenBody.token)
        }
      }
    }
    res.redirect(redirectUrl.toString())
  }
)

// OAuth Link Account
CredentialService.Router.post(
  "/link-social/:socialProvider",
  configureAuth([AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req, res) => {
    const result = await auth.api.linkSocialAccount({
      method: "POST",
      body: {
        provider: req.params.socialProvider,
        additionalData: {
          isSignUp: true
        }
      },
      headers: fromNodeHeaders(req.headers),
      asResponse: true
    })
    if (result.status === 200) {
      const resultBody = await result.json()
      res.setHeader("Set-Cookie", result.headers.get("set-cookie") || "")
      res.json({redirectUrl: resultBody.url})
    } else {
      res.status(500)
      res.json({error: "500.could-not-link-account"})
    }
  }
)

CredentialService.Router.get(
  "/login/one-time-token/:token",
  async (req, res) => {
    // Validates a one time token, and returns the associated session
    // information, and session login cookies
    // Used after a successful o-auth login, or when opening the webview in the mobile app
    const validateResult = await auth.api.verifyOneTimeToken({
      method: "POST",
      body: {
        token: req.params.token
      },
      asResponse: true
    })
    if (validateResult.status === 200) {
      const validateBody = await validateResult.json()
      const session = {session: validateBody.session, user: validateBody.user}
      
      let responseBody = {}
      if (validateBody.oneTimeTokenRequestFlow === OneTimeTokenRequestFlows.OAUTH) {
        // Finalize oauth setup
        // (Makes no changes if setup is already complete)
        const newHeaders = new Headers()
        newHeaders.set("cookie", convertSetCookieToCookie(validateResult.headers))
        try {
          const finalizeOauthSetupResult = await auth.api.finalizeOauthSetup({
            headers: newHeaders,
          })
        } catch (e) {
        }

        // If this login token was generated as part of an oauth flow, include mobile auth tokens
        responseBody = {mobileAuth: await auth.api.createMobileTokens({headers: newHeaders})}
      }

      responseBody = {...responseBody, ... await CredentialService.getLoginResponse(session)}
      res.setHeader("set-cookie", validateResult.headers.get("set-cookie") || "")
      res.json(responseBody)
      return
    }
    res.status(403)
    res.json({error: "403.no-such-credentials"})
  }
)

CredentialService.Router.get(
  "/session-info",
  configureAuth([AuthFlag.skipFullSetupCheck, AuthFlag.allowMobileToken]),
  authenticateSession,
  async (req, res) => {
      res.json(await CredentialService.getLoginResponse({
        session: res.locals.actingUserContext.session,
        user: res.locals.actingUserContext.user
      }))
  }
)

CredentialService.Router.post(
  "/setup-2fa",
  configureAuth([AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req, res) => {
    const r = await auth.api.configure2FA({
      headers: fromNodeHeaders(req.headers),
      body: {
        email: req.body.email,
        phone: req.body.phone
      },
      asResponse: true
    })
    if (r.status === 200) {
      res.json({message: "ok"})
    } else {
      res.status(500)
      res.json({error: "500.failed-two-factor-configuration"})
    }
  }
)

CredentialService.Router.post(
  "/send-2fa",
  configureAuth([AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req, res) => {
    const r = await auth.api.send2FACode({
      headers: fromNodeHeaders(req.headers),
      asResponse: true
    })
    if (r.status === 200) {
      res.json({message: "ok"})
    } else {
      res.status(500)
      res.json({error: "500.send-two-factor-code-failed"})
    }
  }
)

CredentialService.Router.post(
  "/verify-2fa",
  configureAuth([AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req, res) => {
    const r = await auth.api.verify2FACode({
      headers: fromNodeHeaders(req.headers),
      body: {
        code: req.body.code
      },
      asResponse: true
    })
    if (r.status === 200) {
      res.json({message: "ok"})
    } else {
      res.status(500)
      res.json({error: "500.verify-two-factor-code-failed"})
    }
  }
)

CredentialService.Router.get(
  "/mobile-token/one-time-login",
  configureAuth([AuthFlag.allowMobileToken, AuthFlag.disallowCookie, AuthFlag.skipFullSetupCheck]),
  authenticateSession,
  async (req, res) => {
    // Used by the mobile app to open the webview for logged in users
    // Creates a one time token that can be used with "GET /login/one-time-token/<token>"
    // Also rotates participant sessions and creates new mobile auth keys

    const responseBody: any = {}

    // Try to rotate the session
    const rotateSessionResult = await auth.api.tryRotateSession({
      headers: res.locals.actingUserContext.requestHeaders,
      returnHeaders: true
    })

    // Get new mobiles keys if the session was rotated
    if (rotateSessionResult.response.sessionRotated) {
      res.locals.actingUserContext.requestHeaders.set("cookie", convertSetCookieToCookie(rotateSessionResult.headers))
      const newMobileKeys = await auth.api.createMobileTokens({headers: res.locals.actingUserContext.requestHeaders})
      responseBody.mobileKeys = newMobileKeys
    }

    // Get the one time login token
    const oneTimeLoginToken = await auth.api.generateOneTimeToken({
      headers: res.locals.actingUserContext.requestHeaders,
      query: {
        oneTimeTokenRequestFlow: OneTimeTokenRequestFlows.MOBILE_TOKEN_REFRESH
      }
    })
    responseBody.webViewRefreshToken = oneTimeLoginToken.token

    res.json(responseBody)
  }
)

CredentialService.Router.post(
  "/mobile-token/refresh",
  async (req, res) => {
    // Called by the mobile app to obtain new access and refesh tokens when 
    // the previous access token expires. 
    // Body should be of the form: {refreshToken: "<refresh token value>"}

    const throwInvalidRefresh = () => {
      res.status(400)
      res.json({error: "400.invalid-refresh-token"})
    }
    
    // Parse refresh token
    if (!req.body.refreshToken) {
      throwInvalidRefresh()
      return
    }
    const refreshTokenPayload = (await auth.api.verifyJWT({body: {token: req.body.refreshToken}}))?.payload
    if (!refreshTokenPayload) {
      throwInvalidRefresh()
      return
    }

    // Get the session
    let getSessionResult
    try {
      getSessionResult = await auth.api.mobileAuthGetSession({
        body: {token: req.body.refreshToken}, 
        returnHeaders: true
      })
    } catch(err) {
      throwInvalidRefresh()
      return
    }
    const {response, headers} = getSessionResult
    const {session, user} = response
    
    // Check that this is the correct refresh token for this session
    if (refreshTokenPayload.refreshId !== session.currentRefreshToken) {
      throwInvalidRefresh()
      return
    }
    
    // Create a new refresh token and access token
    const newHeaders = new Headers()
    newHeaders.set("cookie", convertSetCookieToCookie(headers))

    const newTokens = await auth.api.createMobileTokens({headers: newHeaders})
    
    res.json(newTokens)
  }
)
