import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
export class Credential {
  public origin = ""
  public access_key = ""
  public secret_key: string | null = ""
  public description = ""
}
