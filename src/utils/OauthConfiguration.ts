export class OauthConfiguration {
    private provider: IdentityProvider;

    constructor() {
        switch(process.env.IDENTITY_PROVIDER) {
            case "AZURE":
                this.provider = IdentityProvider.AZURE;
                break;
            case "GOOGLE":
                this.provider = IdentityProvider.GOOGLE;
                break;
            default:
                this.provider = IdentityProvider.INTERNAL;
                break;
        }
    }
   
    public getStartFlowUrl() : string {
        switch(this.provider) {
            case IdentityProvider.AZURE:
                let url = new URL(`https://login.microsoftonline.com/${process.env.AZURE_TENANT}/oauth2/v2.0/authorize`)

                this.addParameter(url, "response_type", "token");
                this.addParameter(url, "response_mode", "query");
                this.addParameter(url, "client_id", process.env.AZURE_CLIENT_ID);

                this.addParameter(url, "redirect_uri", process.env.OAUTH_REDIRECT_URI);
                this.addParameter(url, "scope", process.env.OAUTH_SCOPE)
                this.addParameter(url, "state", process.env.OAUTH_STATE)
                this.addParameter(url, "nonce", process.env.OAUTH_NONCE)

                return url.href;
            case IdentityProvider.GOOGLE:
                return "https://google.com/oauth2/v2.0/authorize"; // Placeholder
            default:
                return "localhost:3000/auth/login"; // Placeholder
        }
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