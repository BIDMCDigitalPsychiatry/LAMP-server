import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
type JSONSchema = any
export class SensorSpec {
  public name?: string
  public settings_schema?: JSONSchema
}
