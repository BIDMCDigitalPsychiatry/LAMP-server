import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { Activity } from "./Activity"
export class TemporalSlice {
  public item?: any
  public value?: any
  public type?: string
  public duration?: number
  public level?: number
}
export class ActivityEvent {
  public timestamp?: Timestamp
  public duration?: number
  public activity?: Identifier
  public static_data?: any
  public temporal_slices?: TemporalSlice[]
}
