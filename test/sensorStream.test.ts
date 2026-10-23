import { afterAll, beforeAll, describe, expect, it } from "vitest"
import request from "supertest"
import http from "http"
import { AddressInfo } from "net"
import { createHash, randomBytes } from "crypto"
import { readFileSync } from "fs"
import path from "path"
import { Db, ObjectId } from "mongodb"
import app from "../src/app"
import { SensorName } from "../src/model/SensorEvent"
import { OpenAPISchema } from "../src/utils"
import {
  ensureSensorStreamIndexes,
  seedSensorSpecs,
  SENSOR_STREAM_BUCKET,
  SENSOR_STREAM_CHUNK_SIZE_BYTES,
  SENSOR_STREAM_SPECS,
} from "../src/repository/mongo/SensorStreamStorage"
import { mongoClientInstance } from "../src/utils/mongoClient"
import { bootTestDatabase, closeTestDatabase, createFixtures, Fixtures } from "./helpers/server"

// Golden vectors copied unchanged from LAMP-protocol/test-vectors/sensor-stream.
const VECTORS = path.resolve("test/fixtures/sensor-stream")
const vector = (name: string) => readFileSync(path.join(VECTORS, name))
const META = JSON.parse(vector("meta.json").toString("utf8"))
const FRAME_OPENZL = vector("frame.openzl")
const FRAME_ZSTD = vector("frame.zstd")
const FRAME_SINGLE = vector("frame_single.openzl")

const ALL_SPECS = ["lamp.gps1m", ...SENSOR_STREAM_SPECS]
const WINDOW_MS = 300_000
const MAX_FRAME_BYTES = 4 * 1024 * 1024
const OPENZL_MAGIC_BASE = 0xd7b1a5c0
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

type Fields = Record<string, string | number>

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex")

// Fields for a golden vector, without the server-computed `byte_length`.
function fieldsFor(vectorName: string, overrides: Fields = {}): Fields {
  const { byte_length: _ignored, ...fields } = META[vectorName]
  return { ...fields, ...overrides }
}

// A synthetic frame with the given codec's magic number. The server never decompresses, so random
// bytes after the magic are enough to exercise storage, chunking, and listing.
function syntheticFrame(codec: "openzl" | "zstd", size: number): Buffer {
  const buf = randomBytes(size)
  if (codec === "openzl") buf.writeUInt32LE(OPENZL_MAGIC_BASE + 24, 0)
  else ZSTD_MAGIC.copy(buf, 0)
  return buf
}

function syntheticFields(frame: Buffer, spec: string, start: number, end: number, codec = "openzl"): Fields {
  return {
    sensor_spec: spec,
    start_timestamp: start,
    end_timestamp: end,
    sample_count: 500,
    codec,
    codec_format_version: codec === "openzl" ? 24 : 0,
    platform: "android",
    unit: "m/s^2",
    sha256: sha256(frame),
  }
}

type UploadOptions = { auth?: string; apiKey?: string; fileFirst?: boolean; fileField?: string }

function upload(participant: string, fields: Fields, frame: Buffer | null, opts: UploadOptions = {}) {
  let req = request(app).post(`/participant/${participant}/sensor-stream`)
  if (opts.auth) req = req.set("Authorization", opts.auth)
  if (opts.apiKey) req = req.set("x-api-key", opts.apiKey)
  const attach = () => {
    if (frame) {
      req = req.attach(opts.fileField ?? "frame", frame, {
        filename: "frame.bin",
        contentType: "application/octet-stream",
      })
    }
  }
  if (opts.fileFirst) attach()
  for (const [key, value] of Object.entries(fields)) req = req.field(key, String(value))
  if (!opts.fileFirst) attach()
  return req
}

// supertest buffers binary bodies only with an explicit parser.
function download(participant: string, fileId: string, apiKey?: string) {
  let req = request(app)
    .get(`/participant/${participant}/sensor-stream/${fileId}`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = []
      res.on("data", (chunk: Buffer) => chunks.push(chunk))
      res.on("end", () => callback(null, Buffer.concat(chunks)))
    })
  if (apiKey) req = req.set("x-api-key", apiKey)
  return req
}

let db: Db
let f: Fixtures

const filesCollection = () => db.collection(`${SENSOR_STREAM_BUCKET}.files`)
const chunksCollection = () => db.collection(`${SENSOR_STREAM_BUCKET}.chunks`)

async function filesAt(participant: string, spec: string, start: number) {
  return filesCollection()
    .find({
      "metadata.participant_id": participant,
      "metadata.sensor_spec": spec,
      "metadata.start_timestamp": start,
    })
    .toArray()
}

async function chunkCount(fileId: string | ObjectId) {
  return chunksCollection().countDocuments({ files_id: new ObjectId(fileId) })
}

beforeAll(async () => {
  db = await bootTestDatabase()
  f = await createFixtures(app, db)
})

afterAll(async () => {
  await closeTestDatabase()
})

describe("sensor specs", () => {
  it.each(ALL_SPECS)("seeds %s and serves it from GET /sensor_spec/:name", async (spec) => {
    const res = await request(app).get(`/sensor_spec/${spec}`).set("x-api-key", f.researcherAKey)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe(spec)
    expect(typeof res.body.data[0].settings_schema).toBe("object")
  })

  it("adds the five specs to the SensorName enum", () => {
    expect(Object.values(SensorName)).toEqual(expect.arrayContaining(ALL_SPECS))
  })

  it("never overwrites a spec that already exists", async () => {
    const edited = { type: "object", description: "edited by a researcher" }
    await db.collection("sensor_spec").updateOne({ _id: "lamp.gps1m" as any }, { $set: { settings_schema: edited } })
    await seedSensorSpecs(db)
    await seedSensorSpecs(db)
    const docs = await db
      .collection("sensor_spec")
      .find({ _id: "lamp.gps1m" as any })
      .toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].settings_schema).toEqual(edited)
  })
})

describe("ensureSensorStreamIndexes", () => {
  it("creates the listing, deduplication, and chunk indexes", async () => {
    const fresh = mongoClientInstance.db(`${db.databaseName}_indexes`)
    await ensureSensorStreamIndexes(fresh)
    await ensureSensorStreamIndexes(fresh) // idempotent

    const files = await fresh.collection(`${SENSOR_STREAM_BUCKET}.files`).indexes()
    const chunks = await fresh.collection(`${SENSOR_STREAM_BUCKET}.chunks`).indexes()
    const find = (list: any[], key: object) => list.find((i) => JSON.stringify(i.key) === JSON.stringify(key))

    const listing = find(files, { "metadata.participant_id": 1, "metadata.sensor_spec": 1, uploadDate: -1 })
    expect(listing).toBeDefined()
    expect(listing.unique).toBeFalsy()

    const dedup = find(files, {
      "metadata.participant_id": 1,
      "metadata.sensor_spec": 1,
      "metadata.start_timestamp": 1,
      "metadata.sha256": 1,
    })
    expect(dedup).toBeDefined()
    expect(dedup.unique).toBe(true)

    const chunkIndex = find(chunks, { files_id: 1, n: 1 })
    expect(chunkIndex).toBeDefined()
    expect(chunkIndex.unique).toBe(true)
    await fresh.dropDatabase()
  })
})

describe("POST /participant/:id/sensor-stream", () => {
  it.each(SENSOR_STREAM_SPECS)("stores the golden OpenZL frame for %s", async (spec) => {
    const fields = fieldsFor("frame.openzl", { sensor_spec: spec })
    const res = await upload(f.participant, fields, FRAME_OPENZL, { auth: f.participantBearer })
    expect(res.status).toBe(200)
    expect(res.body.data.id).toMatch(/^[0-9a-f]{24}$/)
    expect(res.body.data.duplicate).toBeUndefined()

    const doc = await filesCollection().findOne({ _id: new ObjectId(res.body.data.id) })
    expect(doc).not.toBeNull()
    expect(doc!.metadata).toEqual({
      participant_id: f.participant,
      sensor_spec: spec,
      start_timestamp: META["frame.openzl"].start_timestamp,
      end_timestamp: META["frame.openzl"].end_timestamp,
      sample_count: 500,
      codec: "openzl",
      codec_format_version: 24,
      platform: "android",
      unit: "m/s^2",
      byte_length: FRAME_OPENZL.length,
      sha256: META["frame.openzl"].sha256,
    })
    expect(doc!.chunkSize).toBe(SENSOR_STREAM_CHUNK_SIZE_BYTES)
    expect(doc!.length).toBe(FRAME_OPENZL.length)
    expect(await chunkCount(res.body.data.id)).toBe(Math.ceil(FRAME_OPENZL.length / SENSOR_STREAM_CHUNK_SIZE_BYTES))

    const got = await download(f.participant, res.body.data.id, f.researcherAKey)
    expect(got.status).toBe(200)
    expect(got.headers["content-type"]).toBe("application/octet-stream")
    expect(got.headers["etag"]).toBe(`"${META["frame.openzl"].sha256}"`)
    expect(Buffer.compare(got.body, FRAME_OPENZL)).toBe(0)
    expect(sha256(got.body)).toBe(META["frame.openzl"].sha256)
  })

  // The tier tests above already stored frame.openzl for `participant` at this start_timestamp,
  // so the next two golden vectors go to `sibling` (the same start would be a 409 conflict).
  it("stores the golden zstd frame", async () => {
    const res = await upload(f.sibling, fieldsFor("frame.zstd"), FRAME_ZSTD, { auth: f.siblingBearer })
    expect(res.status).toBe(200)
    const doc = await filesCollection().findOne({ _id: new ObjectId(res.body.data.id) })
    expect(doc!.metadata.codec).toBe("zstd")
    expect(doc!.metadata.codec_format_version).toBe(0)
    expect(doc!.metadata.byte_length).toBe(META["frame.zstd"].byte_length)
  })

  it("stores the golden one-record frame from iOS", async () => {
    const res = await upload(f.sibling, fieldsFor("frame_single.openzl"), FRAME_SINGLE, {
      auth: f.siblingBearer,
    })
    expect(res.status).toBe(200)
    const doc = await filesCollection().findOne({ _id: new ObjectId(res.body.data.id) })
    expect(doc!.metadata.sample_count).toBe(1)
    expect(doc!.metadata.platform).toBe("ios")
    expect(doc!.metadata.start_timestamp).toBe(doc!.metadata.end_timestamp)
  })

  it("splits a large frame into 261120-byte chunks and downloads it byte for byte", async () => {
    const frame = syntheticFrame("zstd", 600_000)
    const start = 1_790_000_400_000
    const res = await upload(
      f.participant,
      syntheticFields(frame, "lamp.accelerometer100hz", start, start + 9_990, "zstd"),
      frame,
      {
        auth: f.participantBearer,
      }
    )
    expect(res.status).toBe(200)
    expect(await chunkCount(res.body.data.id)).toBe(Math.ceil(frame.length / SENSOR_STREAM_CHUNK_SIZE_BYTES))
    const got = await download(f.participant, res.body.data.id, f.researcherAKey)
    expect(got.status).toBe(200)
    expect(got.headers["content-length"]).toBe(String(frame.length))
    expect(Buffer.compare(got.body, frame)).toBe(0)
  })
})

describe("duplicate uploads", () => {
  it("answers an identical retry with duplicate: true and stores one copy", async () => {
    const frame = syntheticFrame("openzl", 300_000)
    const start = 1_790_000_700_000
    const fields = syntheticFields(frame, "lamp.accelerometer50hz", start, start + 9_980)
    const first = await upload(f.participant, fields, frame, { auth: f.participantBearer })
    const second = await upload(f.participant, fields, frame, { auth: f.participantBearer })
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body.data).toEqual({ id: first.body.data.id, duplicate: true })

    const docs = await filesAt(f.participant, "lamp.accelerometer50hz", start)
    expect(docs).toHaveLength(1)
    expect(await chunkCount(docs[0]._id)).toBe(Math.ceil(frame.length / SENSOR_STREAM_CHUNK_SIZE_BYTES))
  })

  it("stores one copy when identical uploads race, and removes the losers' chunks", async () => {
    const frame = syntheticFrame("openzl", 600_000)
    const start = 1_790_001_000_000
    const fields = syntheticFields(frame, "lamp.accelerometer20hz", start, start + 9_950)
    const chunksBefore = await chunksCollection().countDocuments()

    const results = await Promise.all(
      Array.from({ length: 6 }, () => upload(f.participant, fields, frame, { auth: f.participantBearer }))
    )
    for (const res of results) expect(res.status).toBe(200)
    const ids = new Set(results.map((res) => res.body.data.id))
    expect(ids.size).toBe(1)
    expect(results.filter((res) => res.body.data.duplicate !== true)).toHaveLength(1)

    const docs = await filesAt(f.participant, "lamp.accelerometer20hz", start)
    expect(docs).toHaveLength(1)
    const expectedChunks = Math.ceil(frame.length / SENSOR_STREAM_CHUNK_SIZE_BYTES)
    expect(await chunkCount(docs[0]._id)).toBe(expectedChunks)
    expect(await chunksCollection().countDocuments()).toBe(chunksBefore + expectedChunks)
  })

  it("rejects different bytes at the same start with 409", async () => {
    const start = 1_790_001_300_000
    const a = syntheticFrame("openzl", 2_000)
    const b = syntheticFrame("openzl", 2_000)
    const first = await upload(f.participant, syntheticFields(a, "lamp.accelerometer10hz", start, start + 9_900), a, {
      auth: f.participantBearer,
    })
    const second = await upload(f.participant, syntheticFields(b, "lamp.accelerometer10hz", start, start + 9_900), b, {
      auth: f.participantBearer,
    })
    expect(first.status).toBe(200)
    expect(second.status).toBe(409)
    expect(await filesAt(f.participant, "lamp.accelerometer10hz", start)).toHaveLength(1)
  })
})

describe("upload validation", () => {
  const base = () => fieldsFor("frame.openzl", { start_timestamp: 1_790_002_100_000, end_timestamp: 1_790_002_109_980 })

  const cases: Array<[string, () => { fields: Fields; frame: Buffer | null; opts?: UploadOptions }]> = [
    [
      "an unknown sensor_spec",
      () => ({ fields: { ...base(), sensor_spec: "lamp.accelerometer" }, frame: FRAME_OPENZL }),
    ],
    ["the gps1m spec", () => ({ fields: { ...base(), sensor_spec: "lamp.gps1m" }, frame: FRAME_OPENZL })],
    ["the file part before the fields", () => ({ fields: base(), frame: FRAME_OPENZL, opts: { fileFirst: true } })],
    [
      "a missing field",
      () => {
        const { sha256: _missing, ...fields } = base()
        return { fields, frame: FRAME_OPENZL }
      },
    ],
    ["a missing frame part", () => ({ fields: base(), frame: null })],
    ["a file part not named frame", () => ({ fields: base(), frame: FRAME_OPENZL, opts: { fileField: "data" } })],
    [
      "a span across two windows",
      () => {
        const boundary = (Math.floor(1_790_002_100_000 / WINDOW_MS) + 1) * WINDOW_MS
        return {
          fields: { ...base(), start_timestamp: boundary - 10_000, end_timestamp: boundary },
          frame: FRAME_OPENZL,
        }
      },
    ],
    [
      "start after end",
      () => ({
        fields: { ...base(), start_timestamp: 1_790_002_109_980, end_timestamp: 1_790_002_100_000 },
        frame: FRAME_OPENZL,
      }),
    ],
    [
      "a non-integer timestamp",
      () => ({ fields: { ...base(), start_timestamp: "1790002100000.5" }, frame: FRAME_OPENZL }),
    ],
    ["sample_count 0", () => ({ fields: { ...base(), sample_count: 0 }, frame: FRAME_OPENZL })],
    ["sample_count 66001", () => ({ fields: { ...base(), sample_count: 66_001 }, frame: FRAME_OPENZL })],
    ["a non-integer sample_count", () => ({ fields: { ...base(), sample_count: "12.5" }, frame: FRAME_OPENZL })],
    ["an unknown codec", () => ({ fields: { ...base(), codec: "lz4" }, frame: FRAME_OPENZL })],
    ["openzl with format version 0", () => ({ fields: { ...base(), codec_format_version: 0 }, frame: FRAME_OPENZL })],
    ["openzl with format version 27", () => ({ fields: { ...base(), codec_format_version: 27 }, frame: FRAME_OPENZL })],
    ["zstd with format version 24", () => ({ fields: { ...base(), codec: "zstd" }, frame: FRAME_OPENZL })],
    [
      "zstd fields with OpenZL bytes",
      () => ({ fields: { ...base(), codec: "zstd", codec_format_version: 0 }, frame: FRAME_OPENZL }),
    ],
    [
      "openzl fields with zstd bytes",
      () => ({ fields: { ...base(), sha256: META["frame.zstd"].sha256 }, frame: FRAME_ZSTD }),
    ],
    ["an unknown platform", () => ({ fields: { ...base(), platform: "web" }, frame: FRAME_OPENZL })],
    ["a unit other than m/s^2", () => ({ fields: { ...base(), unit: "g" }, frame: FRAME_OPENZL })],
    [
      "an uppercase sha256",
      () => ({ fields: { ...base(), sha256: META["frame.openzl"].sha256.toUpperCase() }, frame: FRAME_OPENZL }),
    ],
    [
      "a sha256 that doesn't match the bytes",
      () => ({ fields: { ...base(), sha256: META["frame.zstd"].sha256 }, frame: FRAME_OPENZL }),
    ],
  ]

  it.each(cases)("rejects %s with 400 and stores nothing", async (_name, build) => {
    const before = await filesCollection().countDocuments()
    const { fields, frame, opts } = build()
    const res = await upload(f.participant, fields, frame, { auth: f.participantBearer, ...opts })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/^400\./)
    expect(await filesCollection().countDocuments()).toBe(before)
  })

  it("rejects a JSON body with 400", async () => {
    const res = await request(app)
      .post(`/participant/${f.participant}/sensor-stream`)
      .set("Authorization", f.participantBearer)
      .send(base())
    expect(res.status).toBe(400)
  })

  it("accepts a frame of exactly 4 MiB", async () => {
    const frame = syntheticFrame("openzl", MAX_FRAME_BYTES)
    const start = 1_790_002_700_000
    const res = await upload(
      f.participant,
      syntheticFields(frame, "lamp.accelerometer100hz", start, start + 9_990),
      frame,
      { auth: f.participantBearer }
    )
    expect(res.status).toBe(200)
    const doc = await filesCollection().findOne({ _id: new ObjectId(res.body.data.id) })
    expect(doc!.length).toBe(MAX_FRAME_BYTES)
  })

  it("rejects a frame over 4 MiB with 413, drains the request, and keeps the connection usable", async () => {
    const frame = syntheticFrame("openzl", MAX_FRAME_BYTES + 1)
    const fields = syntheticFields(frame, "lamp.accelerometer100hz", 1_790_002_400_000, 1_790_002_409_990)
    const before = await filesCollection().countDocuments()

    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    try {
      const boundary = "----lamp-test-boundary"
      const parts: Buffer[] = []
      for (const [key, value] of Object.entries(fields)) {
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`))
      }
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="frame"; filename="frame.bin"\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n`
        ),
        frame,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      )
      const body = Buffer.concat(parts)
      const port = (server.address() as AddressInfo).port

      const send = (method: string, urlPath: string, payload?: Buffer, headers: Record<string, string> = {}) =>
        new Promise<{ status: number; body: string; reused: boolean }>((resolve, reject) => {
          const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, agent, headers }, (res) => {
            let text = ""
            res.setEncoding("utf8")
            res.on("data", (chunk) => (text += chunk))
            res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text, reused: req.reusedSocket }))
          })
          req.on("error", reject)
          req.end(payload)
        })

      const tooLarge = await send("POST", `/participant/${f.participant}/sensor-stream`, body, {
        Authorization: f.participantBearer,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.length),
      })
      expect(tooLarge.status).toBe(413)
      expect(JSON.parse(tooLarge.body).error).toMatch(/^413\./)

      // The server read the whole body, so the same keep-alive socket serves the next request.
      const next = await send(
        "GET",
        `/participant/${f.participant}/sensor-stream?sensor_spec=lamp.accelerometer100hz`,
        undefined,
        {
          "x-api-key": f.researcherAKey,
        }
      )
      expect(next.status).toBe(200)
      expect(next.reused).toBe(true)
    } finally {
      agent.destroy()
      await new Promise((resolve) => server.close(resolve))
    }
    expect(await filesCollection().countDocuments()).toBe(before)
  })
})

describe("authentication and authorization", () => {
  const fields = () =>
    fieldsFor("frame.openzl", { start_timestamp: 1_790_003_100_000, end_timestamp: 1_790_003_109_980 })

  it("rejects an upload without credentials with 403", async () => {
    const res = await upload(f.participant, fields(), FRAME_OPENZL)
    expect(res.status).toBe(403)
  })

  it("rejects an upload with Basic auth with 403", async () => {
    const res = await upload(f.participant, fields(), FRAME_OPENZL, { auth: f.participantBasic })
    expect(res.status).toBe(403)
  })

  it("rejects an upload with a researcher API key with 403 (SYSTEM_ADMIN level)", async () => {
    const res = await upload(f.participant, fields(), FRAME_OPENZL, { apiKey: f.researcherAKey })
    expect(res.status).toBe(403)
  })

  it("rejects an upload with an invalid Bearer token with 403", async () => {
    const res = await upload(f.participant, fields(), FRAME_OPENZL, { auth: "Bearer not-a-token" })
    expect(res.status).toBe(403)
  })

  it("accepts an upload with the participant's mobile Bearer token", async () => {
    const res = await upload(f.participant, fields(), FRAME_OPENZL, { auth: f.participantBearer })
    expect(res.status).toBe(200)
  })

  it("lets the owning researcher's API key read, and refuses another researcher's", async () => {
    const list = `/participant/${f.participant}/sensor-stream?sensor_spec=lamp.accelerometer50hz`
    const owner = await request(app).get(list).set("x-api-key", f.researcherAKey)
    const other = await request(app).get(list).set("x-api-key", f.researcherBKey)
    const none = await request(app).get(list)
    const basic = await request(app).get(list).set("Authorization", f.participantBasic)
    expect(owner.status).toBe(200)
    expect(other.status).toBe(403)
    expect(none.status).toBe(403)
    expect(basic.status).toBe(403)

    const id = owner.body.data[0].id
    expect((await download(f.participant, id, f.researcherAKey)).status).toBe(200)
    expect((await download(f.participant, id, f.researcherBKey)).status).toBe(403)
    expect((await download(f.participant, id)).status).toBe(403)
  })

  it("refuses a participant's Bearer token on another participant's list and download with 403", async () => {
    const spec = META["frame.zstd"].sensor_spec
    const owner = await request(app)
      .get(`/participant/${f.sibling}/sensor-stream?sensor_spec=${spec}`)
      .set("x-api-key", f.researcherAKey)
    expect(owner.status).toBe(200)
    expect(owner.body.data.length).toBeGreaterThan(0)
    const id = owner.body.data[0].id

    const list = await request(app)
      .get(`/participant/${f.sibling}/sensor-stream?sensor_spec=${spec}`)
      .set("Authorization", f.participantBearer)
    expect(list.status).toBe(403)
    const got = await download(f.sibling, id).set("Authorization", f.participantBearer)
    expect(got.status).toBe(403)
  })

  it("refuses a participant's Bearer token uploading into another participant's stream with 403", async () => {
    const start = 1_790_003_400_000
    const res = await upload(
      f.sibling,
      fieldsFor("frame.openzl", { start_timestamp: start, end_timestamp: start + 9_980 }),
      FRAME_OPENZL,
      {
        auth: f.participantBearer,
      }
    )
    expect(res.status).toBe(403)
    expect(await filesAt(f.sibling, META["frame.openzl"].sensor_spec, start)).toHaveLength(0)
  })

  it("refuses a mobile Bearer token on the read routes, even for the participant's own frames", async () => {
    const spec = "lamp.accelerometer50hz"
    const owner = await request(app)
      .get(`/participant/${f.participant}/sensor-stream?sensor_spec=${spec}`)
      .set("x-api-key", f.researcherAKey)
    expect(owner.status).toBe(200)
    const id = owner.body.data[0].id

    for (const participant of [f.participant, "me"]) {
      const list = await request(app)
        .get(`/participant/${participant}/sensor-stream?sensor_spec=${spec}`)
        .set("Authorization", f.participantBearer)
      expect(list.status).toBe(403)
      const got = await download(participant, id).set("Authorization", f.participantBearer)
      expect(got.status).toBe(403)
    }
  })

  it("answers authentication failures with an {error} body", async () => {
    const post = await upload(f.participant, fields(), FRAME_OPENZL)
    expect(post.status).toBe(403)
    expect(post.body).toEqual({ error: "403.no-such-credentials" })

    const list = await request(app).get(
      `/participant/${f.participant}/sensor-stream?sensor_spec=lamp.accelerometer50hz`
    )
    expect(list.status).toBe(403)
    expect(list.body).toEqual({ error: "403.no-such-credentials" })

    const got = await request(app).get(`/participant/${f.participant}/sensor-stream/${new ObjectId().toHexString()}`)
    expect(got.status).toBe(403)
    expect(got.body).toEqual({ error: "403.no-such-credentials" })
  })

  it("returns 404 for a frame that belongs to another participant, or doesn't exist", async () => {
    const owner = await request(app)
      .get(`/participant/${f.participant}/sensor-stream?sensor_spec=lamp.accelerometer50hz`)
      .set("x-api-key", f.researcherAKey)
    expect(owner.status).toBe(200)
    const id = owner.body.data[0].id
    expect((await download(f.sibling, id, f.researcherAKey)).status).toBe(404)
    expect((await download(f.participant, new ObjectId().toHexString(), f.researcherAKey)).status).toBe(404)
    expect((await download(f.participant, "not-an-object-id", f.researcherAKey)).status).toBe(404)
  })
})

describe("GET /participant/:id/sensor-stream", () => {
  const spec = "lamp.accelerometer50hz"
  // Five frames in five consecutive windows for the sibling participant, uploaded out of order.
  const base = 1_790_010_000_000 - (1_790_010_000_000 % WINDOW_MS)
  const frames = [3, 0, 4, 1, 2].map((k) => {
    const frame = syntheticFrame("openzl", 1_000 + k)
    const start = base + k * WINDOW_MS + 1_000
    return { k, frame, start, end: start + 9_980 }
  })
  const ordered = [...frames].sort((a, b) => a.start - b.start)
  const ids = new Map<number, string>()

  beforeAll(async () => {
    for (const fr of frames) {
      const res = await upload(f.sibling, syntheticFields(fr.frame, spec, fr.start, fr.end), fr.frame, {
        auth: f.siblingBearer,
      })
      expect(res.status).toBe(200)
      ids.set(fr.k, res.body.data.id)
    }
  })

  const list = (query: string) =>
    request(app).get(`/participant/${f.sibling}/sensor-stream?${query}`).set("x-api-key", f.researcherAKey)

  it("returns every frame of the spec in ascending start order with the contract fields", async () => {
    const res = await list(`sensor_spec=${spec}&from=${base}&to=${base + 10 * WINDOW_MS}`)
    expect(res.status).toBe(200)
    expect(res.body.next).toBeNull()
    expect(res.body.data.map((d: any) => d.start_timestamp)).toEqual(ordered.map((fr) => fr.start))
    const first = res.body.data[0]
    expect(Object.keys(first).sort()).toEqual(
      [
        "id",
        "sensor_spec",
        "start_timestamp",
        "end_timestamp",
        "sample_count",
        "codec",
        "codec_format_version",
        "platform",
        "unit",
        "byte_length",
        "sha256",
        "upload_date",
      ].sort()
    )
    expect(first).toMatchObject({
      id: ids.get(0),
      sensor_spec: spec,
      end_timestamp: ordered[0].end,
      sample_count: 500,
      codec: "openzl",
      codec_format_version: 24,
      platform: "android",
      unit: "m/s^2",
      byte_length: ordered[0].frame.length,
      sha256: sha256(ordered[0].frame),
    })
    expect(new Date(first.upload_date).toString()).not.toBe("Invalid Date")
  })

  it("matches frames that overlap [from, to): end >= from and start < to", async () => {
    // `from` equals frame 1's end (inclusive); `to` equals frame 4's start (exclusive).
    const res = await list(`sensor_spec=${spec}&from=${ordered[1].end}&to=${ordered[4].start}`)
    expect(res.status).toBe(200)
    expect(res.body.data.map((d: any) => d.id)).toEqual([ids.get(1), ids.get(2), ids.get(3)])

    const justAfter = await list(`sensor_spec=${spec}&from=${ordered[1].end + 1}&to=${ordered[4].start + 1}`)
    expect(justAfter.body.data.map((d: any) => d.id)).toEqual([ids.get(2), ids.get(3), ids.get(4)])
  })

  it("only lists the requested spec", async () => {
    const res = await list(`sensor_spec=lamp.accelerometer10hz&from=0&to=${base + 10 * WINDOW_MS}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it("pages with limit and next until next is null", async () => {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const query: string = `sensor_spec=${spec}&from=${base}&to=${base + 10 * WINDOW_MS}&limit=2${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
      }`
      const res = await list(query)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeLessThanOrEqual(2)
      seen.push(...res.body.data.map((d: any) => d.id))
      cursor = res.body.next
      pages += 1
    } while (cursor && pages < 10)
    expect(pages).toBe(3)
    expect(seen).toEqual([0, 1, 2, 3, 4].map((k) => ids.get(k)))
  })

  it.each([
    ["a missing sensor_spec", "from=0"],
    ["an unknown sensor_spec", "sensor_spec=lamp.gps"],
    ["limit 0", `sensor_spec=${spec}&limit=0`],
    ["limit 1001", `sensor_spec=${spec}&limit=1001`],
    ["a non-numeric from", `sensor_spec=${spec}&from=yesterday`],
    ["a malformed cursor", `sensor_spec=${spec}&cursor=%%%`],
  ])("rejects %s with 400", async (_name, query) => {
    const res = await list(query)
    expect(res.status).toBe(400)
  })
})

describe("GET /participant/:id/sensor-stream query cost", () => {
  const spec = "lamp.accelerometer10hz"
  const base = 1_700_000_000_000 - (1_700_000_000_000 % WINDOW_MS)
  const WINDOWS = 300
  // One frame per window, spanning most of it, inserted straight into GridFS's files collection
  // (listing never reads chunks).
  const docs = Array.from({ length: WINDOWS }, (_, k) => {
    const start = base + k * WINDOW_MS + 500
    return {
      _id: new ObjectId(),
      length: 100,
      chunkSize: SENSOR_STREAM_CHUNK_SIZE_BYTES,
      uploadDate: new Date(),
      filename: `query-cost/${spec}/${start}`,
      metadata: {
        participant_id: "",
        sensor_spec: spec,
        start_timestamp: start,
        end_timestamp: start + 299_000,
        sample_count: 500,
        codec: "openzl",
        codec_format_version: 24,
        platform: "android",
        unit: "m/s^2",
        byte_length: 100,
        sha256: sha256(Buffer.from(String(k))),
      },
    }
  })

  beforeAll(async () => {
    for (const doc of docs) doc.metadata.participant_id = f.participant
    await filesCollection().insertMany(docs as any[])
  })

  afterAll(async () => {
    await filesCollection().deleteMany({ _id: { $in: docs.map((doc) => doc._id) } })
  })

  it("examines only the frames near [from, to), not the participant's whole history", async () => {
    // The last two windows; `from` sits inside the second-to-last frame, so that frame overlaps.
    const from = docs[WINDOWS - 2].metadata.start_timestamp + 1_000
    const to = docs[WINDOWS - 1].metadata.end_timestamp + 1
    const expected = docs
      .filter((doc) => doc.metadata.end_timestamp >= from && doc.metadata.start_timestamp < to)
      .map((doc) => doc._id.toHexString())
    expect(expected).toHaveLength(2)

    await db.command({ profile: 2 })
    let res: request.Response
    try {
      res = await request(app)
        .get(`/participant/${f.participant}/sensor-stream?sensor_spec=${spec}&from=${from}&to=${to}`)
        .set("x-api-key", f.researcherAKey)
    } finally {
      await db.command({ profile: 0 })
    }
    expect(res.status).toBe(200)
    expect(res.body.data.map((d: any) => d.id)).toEqual(expected)

    const [profile] = await db
      .collection("system.profile")
      .find({ ns: `${db.databaseName}.${SENSOR_STREAM_BUCKET}.files`, op: "query" })
      .sort({ ts: -1 })
      .limit(1)
      .toArray()
    expect(profile).toBeDefined()
    expect(profile.docsExamined).toBeLessThanOrEqual(expected.length + 2)
    expect(profile.keysExamined).toBeLessThanOrEqual(expected.length + 3)
  })
})

describe("lamp.gps1m sensor_event", () => {
  it("stores a gps1m event with the lamp.gps data shape", async () => {
    const event = {
      timestamp: 1_790_000_160_000,
      sensor: "lamp.gps1m",
      data: { latitude: 42.3389, longitude: -71.1066, altitude: 12.5, accuracy: 4.8 },
    }
    const res = await request(app)
      .post(`/participant/${f.participant}/sensor_event`)
      .set("Authorization", f.participantBearer)
      .send(event)
    expect(res.status).toBe(200)

    const stored = await db.collection("sensor_event").findOne({ _parent: f.participant, sensor: "lamp.gps1m" })
    expect(stored).toMatchObject(event)

    const read = await request(app)
      .get(`/participant/${f.participant}/sensor_event?origin=lamp.gps1m`)
      .set("x-api-key", f.researcherAKey)
    expect(read.status).toBe(200)
    expect(read.body.data).toEqual([event])
  })
})

describe("OpenAPI schema", () => {
  const schema: any = (OpenAPISchema as any).default ?? OpenAPISchema

  it("describes the three sensor-stream operations", () => {
    expect(schema.paths).toHaveProperty(["/participant/{id}/sensor-stream"])
    expect(schema.paths).toHaveProperty(["/participant/{id}/sensor-stream/{file_id}"])
    expect(schema.paths["/participant/{id}/sensor-stream"].post.operationId).toBe("SensorStream.create")
    expect(schema.paths["/participant/{id}/sensor-stream"].get.operationId).toBe("SensorStream.list")
    expect(schema.paths["/participant/{id}/sensor-stream/{file_id}"].get.operationId).toBe("SensorStream.view")
    expect(schema.components.schemas.SensorStreamFrame.required).toEqual(
      expect.arrayContaining(["id", "sensor_spec", "start_timestamp", "end_timestamp", "sha256"])
    )
  })
})
