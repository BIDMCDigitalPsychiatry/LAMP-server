import { Identifier, Timestamp } from "./Type"
import { Activity } from "./Activity"
import { Participant } from "./Participant"
import { Researcher } from "./Researcher"
import mongoose from "mongoose"
const { Schema } = mongoose
export class Study {
  public id?: Identifier
  public name?: string
  public activities?: Identifier[]
  public participants?: Identifier[]
}

//Mongo Db Model for study collection
export const StudyModel = mongoose.model<mongoose.Document>(
  "study",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      _parent: { type: String, required: true },
      timestamp: { type: Number, required: true },
      _deleted: { type: Boolean, default: false },
    },
    { collection: "study", autoCreate: true, versionKey: false }
  ).index([{ timestamp: 1 }, { timestamp: 1, _id: 1 }, { timestamp: 1, _id: 1, _parent: 1 }])
)
