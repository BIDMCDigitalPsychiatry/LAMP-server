
export function getConfiguredOAuthOptions() {
    const providerConfigurations = [
        ["google", getGoogleOAuthConfiguration()],
        ["apple", getAppleOAuthConfiguration()],
        ["microsoft", getMicrosoftOAuthConfiguration()]
    ]
    return Object.fromEntries(providerConfigurations.filter(([key, config]) => config !== undefined))
}

function getGoogleOAuthConfiguration() {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!(!!clientSecret && !!clientId)) {
        return undefined
    }
    return {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirectURI: `${process.env.BETTER_AUTH_URL}/login/google/callback/`,
        disableImplicitSignUp: true,
    }
}

function getAppleOAuthConfiguration() {
    return undefined
}

function getMicrosoftOAuthConfiguration() {
    return undefined
}