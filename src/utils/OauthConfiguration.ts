export class OauthConfiguration {
  private provider: IdentityProvider | null

  constructor() {
    switch(process.env.IDENTITY_PROVIDER) {
      case "AZURE":
        this.provider = IdentityProvider.AZURE
        break
      case "GOOGLE":
        this.provider = IdentityProvider.GOOGLE
        break
      default:
        this.provider = IdentityProvider.INTERNAL
        break
    }
  }

  public get isEnabled() : boolean {
    return this.provider != IdentityProvider.INTERNAL
  }
  
  public getStartFlowUrl() : string | null {
    if (!this.isEnabled) return null

    switch(this.provider) {
      case IdentityProvider.AZURE:
        let url = this.getAzureUrl("auth")

        this.addParameter(url, "response_type", "code");
        this.addParameter(url, "response_mode", "fragment");
        this.addParameter(url, "client_id", process.env.AZURE_CLIENT_ID);

        this.addParameter(url, "redirect_uri", process.env.OAUTH_REDIRECT_URI);
        this.addParameter(url, "scope", process.env.OAUTH_SCOPE)
        this.addParameter(url, "state", process.env.OAUTH_STATE)
        this.addParameter(url, "nonce", process.env.OAUTH_NONCE)
        this.addParameter(url, "code_challenge_method", "S256")

        return url.href;
      case IdentityProvider.GOOGLE:
        return "https://google.com/oauth2/v2.0/authorize"; // Placeholder
      default:
        return "localhost:3000/auth/login"; // Placeholder
    }
  }

  public getRedeemTokenData(code: string, code_verifier: string) : {url: URL, body: URLSearchParams } {
    switch(this.provider) {
      case IdentityProvider.AZURE:
        let url = this.getAzureUrl("token")
        
        let params = new URLSearchParams()
        params.append("client_id", process.env.AZURE_CLIENT_ID ?? "")
        params.append("scope", process.env.OAUTH_SCOPE ?? "")
        params.append("code", code)
        params.append("redirect_uri", process.env.OAUTH_REDIRECT_URI ?? "")
        params.append("grant_type", "authorization_code")
        params.append("code_verifier", code_verifier)
        params.append("client_secret", process.env.AZURE_CLIENT_SECRET ?? "")
        return {url: url, body: params}
      case IdentityProvider.GOOGLE:
        return {url: new URL("https://google.com/oauth2/v2.0/token"), body: new URLSearchParams()}; // Placeholder
      default:
        return {url: new URL("https://google.com/oauth2/v2.0/token"), body: new URLSearchParams()}; // Placeholder
    }
  }

  private getAzureUrl(endpoint: string) : URL {
    return new URL(`http://localhost:8080/realms/MindLAMP/protocol/openid-connect/${endpoint}`)
  }

  private addParameter(url: URL, name: string, value: string | undefined) {
    if(!!value) {
      url.searchParams.set(name, value);
    }
  }
}

enum IdentityProvider {
  AZURE,
  GOOGLE,
  INTERNAL
}