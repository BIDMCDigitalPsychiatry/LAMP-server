import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import mongoose from "mongoose"
const { Schema } = mongoose
type JSONSchema = any
export class ActivitySpec {
  public name?: string
  public help_contents?: string
  public script_contents?: string
  public static_data_schema?: JSONSchema
  public temporal_slice_schema?: JSONSchema
  public settings_schema?: JSONSchema
}

//Mongo Db Model for activity_spec collection
export const ActivitySpecModel = mongoose.model(
  "activity_spec",
  new Schema(
    {
      _id: { type: String, required: true },
    },
    { collection: "activity_spec", autoCreate: true, versionKey: false }
  )
)
