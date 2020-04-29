import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
type JSONSchema = any
export class ActivitySpec {
  public name?: string
  public help_contents?: string
  public script_contents?: string
  public static_data_schema?: JSONSchema
  public temporal_slice_schema?: JSONSchema
  public settings_schema?: JSONSchema
}
