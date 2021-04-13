import { Identifier, Timestamp } from "./Type"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import mongoose from "mongoose"
import { timeStamp } from "console"
const { Schema } = mongoose
export class Participant {
  public id?: Identifier
  public study_code?: string
  public language?: string
  public theme?: string
  public emergency_contact?: string
  public helpline?: string
}

//Mongo Db Model for participant collection
export const ParticipantModel = mongoose.model<mongoose.Document>(
  "participant",
  new Schema(
    {
      _id: { type: String, required: true },
      _parent: { type: String, required: true },
      timestamp: { type: Number, required: true },
      _deleted: { type: Boolean, default: false },
    },
    { collection: "participant", autoCreate: true, versionKey: false }
  ).index([{ timestamp: 1 }, { _parent: 1, timestamp: 1 }, { _id: 1, _parent: 1, timestamp: 1 }])
)
