import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { DurationIntervalLegacy } from "./Document"
import mongoose from "mongoose"
const { Schema } = mongoose
export class Activity {
  public id?: Identifier
  public spec?: Identifier
  public name?: string
  public schedule?: DurationIntervalLegacy
  public settings?: any
}

//Mongo Db Model for activity collection
export const ActivityModel = mongoose.model<mongoose.Document>(
  "activity",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      _parent: { type: String, required: true },
      spec: { type: String, required: true },
      settings: { type: Object },
      schedule: { type: Array },
      timestamp: { type: Number, required: true },
      _deleted: { type: Boolean, default: false },
    },
    { collection: "activity", autoCreate: true, versionKey: false }
  ).index([
    { timestamp: 1 },
    { timestamp: 1, _parent: 1 },
    { _id: 1, timestamp: 1 },
    { timestamp: 1, _id: 1, _parent: 1 },
  ])
)
