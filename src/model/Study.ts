import { Identifier, Timestamp } from "./Type"
import { Activity } from "./Activity"
import { Participant } from "./Participant"
import { Researcher } from "./Researcher"
export class Study {
  public id?: Identifier
  public name?: string
  public activities?: Identifier[]
  public participants?: Identifier[]
}
