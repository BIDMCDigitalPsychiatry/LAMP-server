import { Identifier, Timestamp } from "./Type"
import mongoose from "mongoose"
const { Schema } = mongoose

export class Sensor {
  public id?: Identifier
  public spec?: Identifier
  public name?: string
  public settings?: any
}

//Mongo Db Model for sensor collection
export const SensorModel = mongoose.model<mongoose.Document>(
  "sensor",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      _parent: { type: String, required: true },
      spec: { type: String, required: true },
      settings: { type: Object },
      timestamp: { type: Number, required: true },
      _deleted: { type: Boolean, default: false },
    },
    { collection: "sensor", autoCreate: true, versionKey: false }
  ).index([
    { timestamp: 1 },
    { timestamp: 1, _parent: 1 },
    { _id: 1, timestamp: 1 },
    { timestamp: 1, _id: 1, _parent: 1 },
  ])
)
