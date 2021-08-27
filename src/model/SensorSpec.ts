import { Identifier, Timestamp } from "./Type"

type JSONSchema = any
export class SensorSpec {
  public name?: string
  public settings_schema?: JSONSchema  
}
