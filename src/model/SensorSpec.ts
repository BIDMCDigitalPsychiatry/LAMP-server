import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import mongoose from "mongoose"
const { Schema } = mongoose
type JSONSchema = any
export class SensorSpec {
  public name?: string
  public settings_schema?: JSONSchema
}

//Mongo Db Model for sensor_spec collection
export const SensorSpecModel = mongoose.model<mongoose.Document>(
  "sensor_spec",
  new Schema(
    {
      _id: { type: String, required: true },
    },
    { collection: "sensor_spec", autoCreate: true }
  )
)
