export class PersonalAccessToken {
    public token: string = ""
    public description: string = ""
    public createdAt: number = Date.now()
    public expiresAt: number = Date.now()
}