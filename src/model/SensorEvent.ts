import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import mongoose from "mongoose"
const { Schema } = mongoose
export enum SensorName {
  Analytics = "lamp.analytics",
  Accelerometer = "lamp.accelerometer",
  Bluetooth = "lamp.bluetooth",
  Calls = "lamp.calls",
  DeviceState = "lamp.device_state",
  SMS = "lamp.sms",
  WiFi = "lamp.wifi",
  Audio = "lamp.audio_recordings",
  Location = "lamp.gps",
  ContextualLocation = "lamp.gps.contextual",
  Height = "lamp.height",
  Weight = "lamp.weight",
  HeartRate = "lamp.heart_rate",
  BloodPressure = "lamp.blood_pressure",
  RespiratoryRate = "lamp.respiratory_rate",
  Sleep = "lamp.sleep",
  Steps = "lamp.steps",
  Flights = "lamp.flights",
  Segment = "lamp.segment",
  Distance = "lamp.distance",
}
export enum LocationContext {
  Home = "home",
  School = "school",
  Work = "work",
  Hospital = "hospital",
  Outside = "outside",
  Shopping = "shopping",
  Transit = "transit",
}
export enum SocialContext {
  Alone = "alone",
  Friends = "friends",
  Family = "family",
  Peers = "peers",
  Crowd = "crowd",
}
export class SensorEvent {
  public timestamp?: Timestamp
  public sensor?: SensorName
  public data?: any
}

//Mongo Db Model for sensor_event collection
export const SensorEventModel = mongoose.model<mongoose.Document>(
  "sensor_event",
  new Schema(
    {
      _parent: { type: String, required: true },
      timestamp: { type: Number, required: true },
      duration: { type: Number },
      sensor: { type: String, required: true },
      data: { type: Object },
    },
    { collection: "sensor_event", minimize: false, autoCreate: true }
  ).index([
    { _parent: -1, sensor: -1, timestamp: -1 },
    { _parent: -1, timestamp: -1 },
  ])
)
