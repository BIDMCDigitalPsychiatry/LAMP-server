import { Db, GridFSBucket, ReadPreference } from "mongodb"

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

const ACCELEROMETER_HZ: Record<SensorStreamSpec, number> = {
  "lamp.accelerometer10hz": 10,
  "lamp.accelerometer20hz": 20,
  "lamp.accelerometer50hz": 50,
  "lamp.accelerometer100hz": 100,
}

// The `sensor_spec` documents that `seedSensorSpecs` inserts. Spec names start with `lamp.`, which
// the `POST /sensor_spec` validator reserves, so the server seeds them itself.
export const SEEDED_SENSOR_SPECS: Array<{ name: string; settings_schema: object }> = [
  {
    name: GPS1M_SPEC,
    settings_schema: {
      type: "object",
      title: "GPS, once per minute",
      description:
        "Records about one high-accuracy location fix every 60 seconds. Each fix is uploaded as a " +
        "`lamp.gps1m` sensor event with the same data shape as `lamp.gps`.",
      properties: {},
    },
  },
  ...SENSOR_STREAM_SPECS.map((name) => ({
    name,
    settings_schema: {
      type: "object",
      title: `Accelerometer, ${ACCELEROMETER_HZ[name]} Hz`,
      description:
        `Samples the accelerometer at ${ACCELEROMETER_HZ[name]} Hz in m/s^2 and uploads compressed ` +
        "5-minute frames to `POST /participant/{participant_id}/sensor-stream`.",
      properties: {},
    },
  })),
]

// Returns the GridFS bucket for sensor-stream frames. Reads go to the primary so that a
// duplicate check never misses a frame that was just written.
export function sensorStreamBucket(db: Db): GridFSBucket {
  return new GridFSBucket(db, {
    bucketName: SENSOR_STREAM_BUCKET,
    chunkSizeBytes: SENSOR_STREAM_CHUNK_SIZE_BYTES,
    readPreference: ReadPreference.primary,
  })
}

// Creates the `.files` and `.chunks` indexes of the sensor-stream bucket. Safe to call on every start.
export async function ensureSensorStreamIndexes(db: Db): Promise<void> {
  const files = db.collection(`${SENSOR_STREAM_BUCKET}.files`)
  await files.createIndex(
    { "metadata.participant_id": 1, "metadata.sensor_spec": 1, uploadDate: -1 },
    { name: "participant_spec_upload_date" }
  )
  // Deduplicates retries and serves the range queries of `GET .../sensor-stream`.
  await files.createIndex(
    {
      "metadata.participant_id": 1,
      "metadata.sensor_spec": 1,
      "metadata.start_timestamp": 1,
      "metadata.sha256": 1,
    },
    { name: "participant_spec_start_sha256", unique: true }
  )
  // Same key and default name as the index the driver creates for a new bucket, so the two never conflict.
  await db.collection(`${SENSOR_STREAM_BUCKET}.chunks`).createIndex({ files_id: 1, n: 1 }, { unique: true })
}

// Inserts the five sensor-stream specs when they're missing. Never overwrites an existing spec,
// including one that an administrator edited or deleted.
export async function seedSensorSpecs(db: Db): Promise<void> {
  const specs = db.collection<{ _id: string; settings_schema: object; _deleted: boolean }>("sensor_spec")
  for (const spec of SEEDED_SENSOR_SPECS) {
    await specs.updateOne(
      { _id: spec.name },
      { $setOnInsert: { settings_schema: spec.settings_schema, _deleted: false } },
      { upsert: true }
    )
  }
}
