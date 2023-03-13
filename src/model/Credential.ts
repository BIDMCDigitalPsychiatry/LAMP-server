import { PersonalAccessToken } from "./PersonalAccessToken"

export class Credential {
  public origin = ""
  public access_key = ""
  public secret_key: string | null = ""
  public refresh_token: string | null = ""
  public description = ""
  public tokens: PersonalAccessToken[] = []
}
