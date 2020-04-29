import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { Activity } from "./Activity"
export type Identifier = string
export type Timestamp = number
export class DynamicAttachment {
  public key?: string
  public from?: Identifier
  public to?: string
  public triggers?: string[]
  public language?: string
  public contents?: string
  public requirements?: string[]
  public input_schema?: string
  public output_schema?: string
}
