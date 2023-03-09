export class PersonalAccessToken {
    public token: string = ""
    public description: string = ""
    public created: number = Date.now()
    public expiry: number = Date.now()
}