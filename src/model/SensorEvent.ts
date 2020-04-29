import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
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
