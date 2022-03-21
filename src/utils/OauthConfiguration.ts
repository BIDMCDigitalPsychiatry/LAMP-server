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
                return "https://login.microsoftonline.com/" + process.env.AZURE_TENANT + "/oauth2/v2.0/authorize";
            case IdentityProvider.GOOGLE:
                return "https://google.com/oauth2/v2.0/authorize"; // Placeholder
            default:
                return "localhost:3000/auth/login"; // Placeholder
        }
    }
}

enum IdentityProvider {
    AZURE,
    GOOGLE,
    INTERNAL
}