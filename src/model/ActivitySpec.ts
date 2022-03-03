import { Identifier, Timestamp } from "./Type"
type JSONSchema = any
type Tab = 'learn' | 'assess' | 'manage' | 'prevent'
export class ActivitySpec {
  public name?: string
  public description?: string
  public executable?: string
  public static_data?: JSONSchema
  public temporal_slices?: JSONSchema
  public settings?: JSONSchema
  public category?: Tab[] | null
}
