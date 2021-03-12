import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import mongoose from "mongoose"
const { Schema } = mongoose
export class Researcher {
  public id?: Identifier
  public name?: string
  public email?: string
  public address?: string
  public studies?: Identifier[]
}

//Mongo Db Model for researcher collection
export const ResearcherModel = mongoose.model<mongoose.Document>(
  "researcher",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      timestamp: { type: Number, required: true },
      _deleted: { type: Boolean, default: false },
    },
    { collection: "researcher", autoCreate: true }
  ).index([{ timestamp: 1 }, { timestamp: 1, _id: 1 }])
)
