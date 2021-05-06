import { Identifier, Timestamp } from "./Type"
import { timeStamp } from "console"

export class Participant {
  public id?: Identifier
  public study_code?: string
  public language?: string
  public theme?: string
  public emergency_contact?: string
  public helpline?: string
}
