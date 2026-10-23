import { Timestamp } from "./Type"

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
  // One GPS fix per minute, uploaded as JSON sensor events.
  LocationPerMinute = "lamp.gps1m",
  // High-rate accelerometer tiers, uploaded as binary frames to `/sensor-stream`.
  Accelerometer10Hz = "lamp.accelerometer10hz",
  Accelerometer20Hz = "lamp.accelerometer20hz",
  Accelerometer50Hz = "lamp.accelerometer50hz",
  Accelerometer100Hz = "lamp.accelerometer100hz",
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
