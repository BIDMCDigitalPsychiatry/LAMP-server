import mongoose from "mongoose"
const { Schema } = mongoose

export class Sensor {}

//Mongo Db Model for sensor collection
export const SensorModel = mongoose.model<mongoose.Document>(
  "sensor",
  new Schema(
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      "#parent": { type: String, required: true },
      spec: { type: String, required: true },
      settings: { type: Object },
      timestamp: { type: Number, required: true },
    },
    { collection: "sensor", autoCreate: true }
  ).index([
    { timestamp: 1 },
    { timestamp: 1, "#parent": 1 },
    { _id: 1, timestamp: 1 },
    { timestamp: 1, _id: 1, "#parent": 1 },
  ])
)
