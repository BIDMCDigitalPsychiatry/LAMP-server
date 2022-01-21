import { Identifier, Timestamp } from "./Type"
type JSONSchema = any
type Tab = 'learn' | 'assess' | 'manage' | 'prevent'
export class ActivitySpec {
  public name?: string
  public help_contents?: string
  public script_contents?: string
  public static_data_schema?: JSONSchema
  public temporal_slice_schema?: JSONSchema
  public settings_schema?: JSONSchema
  public category?: Tab[] | null
  public executable?: string | null
}
