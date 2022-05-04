export class OauthConfiguration {
  public get isEnabled(): boolean {
    return process.env.OAUTH === "on"
  }

  public getStartFlowUrl(): string {
    if (!process.env.OAUTH_AUTH_URL) {
      throw Error("Environment variable OAUTH_TOKEN_URL not set")
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

  public getRedeemTokenData(code: string, code_verifier: string): { url: URL; body: URLSearchParams } {
    if (!process.env.OAUTH_TOKEN_URL) {
      throw Error("Environment variable OAUTH_AUTH_URL not set")
    }

    const url = new URL(process.env.OAUTH_TOKEN_URL)

    const params = new URLSearchParams()
    params.append("client_id", process.env.OAUTH_CLIENT_ID ?? "")
    params.append("scope", process.env.OAUTH_SCOPE ?? "")
    params.append("code", code)
    params.append("redirect_uri", process.env.OAUTH_REDIRECT_URI ?? "")
    params.append("grant_type", "authorization_code")
    params.append("code_verifier", code_verifier)
    params.append("client_secret", process.env.OAUTH_CLIENT_SECRET ?? "")
    return { url: url, body: params }
  }
}

const addParameter = (url: URL, name: string, value: string | undefined) => {
  if (!!value) {
    url.searchParams.set(name, value)
  }
}
