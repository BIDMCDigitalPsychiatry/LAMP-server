import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { DurationIntervalLegacy } from "./Document"
export class Activity {
  public id?: Identifier
  public spec?: Identifier
  public name?: string
  public schedule?: DurationIntervalLegacy
  public settings?: any
}
