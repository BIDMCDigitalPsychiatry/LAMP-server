import { Identifier, Timestamp } from "./Type"

type JSONSchema = any
export class SensorSpec {
  public name?: string
  public properties?: JSONSchema
  public type?: string
  public description?: string
  public required?: JSONSchema
  public additionalProperties?: boolean
}
