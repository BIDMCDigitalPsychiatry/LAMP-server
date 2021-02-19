import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { Activity } from "./Activity"
import mongoose from "mongoose"
import { KeyObject } from "crypto"
const { Schema } = mongoose
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

const ActivityEventSchema = new Schema(
  {
    "#parent": { type: String, required: true },
    timestamp: { type: Number, required: true },
    duration: { type: Number },
    _deleted: { type: Boolean, default: false },
    activity: { type: String, required: true },
    static_data: { type: Object },
    temporal_slices: { type: Array },
  },
  { collection: "activity_event", minimize: false }
).index([
  { "#parent": -1, activity: -1, timestamp: -1 },
  { "#parent": -1, timestamp: -1 },
])

//Mongo Db Model for activity-event collection
export const ActivityEventModel = mongoose.model<mongoose.Document>(
  "activity_event",
  new Schema(
    {
      "#parent": { type: String, required: true },
      timestamp: { type: Number, required: true },
      duration: { type: Number },
      _deleted: { type: Boolean, default: false },
      activity: { type: String, required: true },
      static_data: { type: Object },
      temporal_slices: { type: Array },
    },
    { collection: "activity_event", minimize: false, autoCreate: true }
  ).index([
    { "#parent": -1, activity: -1, timestamp: -1 },
    { "#parent": -1, timestamp: -1 },
  ])
)
