import { Request } from "node-fetch"

export class OAuthConfiguration {

  private static _loginUrl: string | null | undefined;

  static get loginUrl() {
    return this._loginUrl || (this._loginUrl = OAuthConfiguration.getLoginURL())
  }
  public static get isEnabled(): boolean {
    return process.env.OAUTH === "on"
  }

  public static getLoginURL(): string | null {
    if (!process.env.OAUTH_AUTH_URL) {
      return null
    }

    const url = new URL(process.env.OAUTH_AUTH_URL)
    addParameter(url, "response_type", "code")
    addParameter(url, "response_mode", "fragment")
    addParameter(url, "client_id", process.env.OAUTH_CLIENT_ID)

    addParameter(url, "redirect_uri", process.env.OAUTH_REDIRECT_URI)
    addParameter(url, "scope", process.env.OAUTH_SCOPE)
    addParameter(url, "state", process.env.OAUTH_STATE)
    addParameter(url, "nonce", process.env.OAUTH_NONCE)
    addParameter(url, "code_challenge_method", "S256")

    return url.href
  }

  public static getLogoutURL(): string | null {
    return process.env.OAUTH_LOGOUT_URL ?? null
  }

  public static getRedeemCodeRequest(code: string, code_verifier: string): Request {
    console.log(`[OAuth] (getRedeemCodeRequest) OAUTH_TOKEN_URL: ${process.env.OAUTH_TOKEN_URL}`)

    if (!process.env.OAUTH_TOKEN_URL) {
      throw Error("Environment variable OAUTH_AUTH_URL not set")
    }

    const params = new URLSearchParams()
    params.append("client_id", process.env.OAUTH_CLIENT_ID ?? "")
    params.append("scope", process.env.OAUTH_SCOPE ?? "")
    params.append("code", code)
    params.append("redirect_uri", process.env.OAUTH_REDIRECT_URI ?? "")
    params.append("grant_type", "authorization_code")
    params.append("code_verifier", code_verifier)
    params.append("client_secret", process.env.OAUTH_CLIENT_SECRET ?? "")

    console.log("[OAuth] (getRedeemCodeRequest) Request parameters:")
    for (const param of ["client_id", "scope", "redirect_uri", "grant_type", "client_secret"]) {
      console.log(`[OAuth] ${param}: ${params.get(param)}`)
    }

    return new Request(
      process.env.OAUTH_TOKEN_URL,
      { method: "POST", body: params }
    )
  }

  public static getRefreshTokenRequest(refreshToken: string): Request {
    if (!process.env.OAUTH_TOKEN_URL) {
      throw Error("Environment variable OAUTH_AUTH_URL not set")
    }

    const params = new URLSearchParams()
    params.append("client_id", process.env.OAUTH_CLIENT_ID ?? "")
    params.append("client_secret", process.env.OAUTH_CLIENT_SECRET ?? "")
    params.append("grant_type", "refresh_token")
    params.append("refresh_token", refreshToken)

    return new Request(
      process.env.OAUTH_TOKEN_URL,
      { method: "POST", body: params }
    )
  }
}

const addParameter = (url: URL, name: string, value?: string) => {
  if (!!value) {
    url.searchParams.set(name, value)
  }
}
