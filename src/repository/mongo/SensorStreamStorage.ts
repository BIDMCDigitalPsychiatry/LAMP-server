import { Db } from "mongodb"

// GridFS bucket that holds binary accelerometer frames (see LAMP-protocol docs/sensor-stream.md).
export const SENSOR_STREAM_BUCKET = "accelerometer_telemetry"
// 255 KiB, the GridFS default, pinned so the chunk count of a frame is predictable.
export const SENSOR_STREAM_CHUNK_SIZE_BYTES = 261_120

export const SENSOR_STREAM_SPECS = [
  "lamp.accelerometer10hz",
  "lamp.accelerometer20hz",
  "lamp.accelerometer50hz",
  "lamp.accelerometer100hz",
] as const
export type SensorStreamSpec = (typeof SENSOR_STREAM_SPECS)[number]

export const GPS1M_SPEC = "lamp.gps1m"

// Creates the `.files` and `.chunks` indexes of the sensor-stream bucket. Safe to call on every start.
export async function ensureSensorStreamIndexes(db: Db): Promise<void> {
  throw new Error("not implemented")
}

// Inserts the five sensor-stream specs when they're missing. Never overwrites an existing spec.
export async function seedSensorSpecs(db: Db): Promise<void> {
  throw new Error("not implemented")
}
