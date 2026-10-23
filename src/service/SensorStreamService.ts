import { Request, Response, Router } from "express"
import busboy from "busboy"
import { createHash } from "crypto"
import { finished, pipeline } from "stream/promises"
import { Db, ObjectId, ReadPreference } from "mongodb"
import { z } from "zod"
import { _authorize, ApiKeyAccessLevels } from "./Security"
import { ApiResponseHeaders, MongoClientDB } from "../repository/Bootstrap"
import { ActingUserContext, authenticateSession, AuthFlag, configureAuth } from "../middlewares/authenticateSession"
import { SENSOR_STREAM_BUCKET, SENSOR_STREAM_SPECS, sensorStreamBucket } from "../repository/mongo/SensorStreamStorage"

// Wire contract: LAMP-protocol docs/sensor-stream.md.
const WINDOW_MS = 300_000
const RECORD_BYTES = 20
const MAX_FRAME_BYTES = 4 * 1024 * 1024
const MAX_SAMPLE_COUNT = 66_000
const LIST_LIMIT_MAX = 1000
const CODEC_FORMAT_VERSION = { openzl: 24, zstd: 0 } as const
// An OpenZL frame starts with the little-endian `uint32` 0xD7B1A5C0 + format version.
const OPENZL_MAGIC_BASE = 0xd7b1a5c0
// A zstd frame starts with the bytes 28 B5 2F FD.
const ZSTD_MAGIC = 0xfd2fb528

// An error whose message starts with its HTTP status, like the rest of the API ("400.xxx").
class HttpError extends Error {
  constructor(message: string, public detail?: string) {
    super(message)
  }
}

const integer = (pattern: RegExp) =>
  z
    .string()
    .regex(pattern, "must be a non-negative integer")
    .transform((value) => Number(value))

const UploadFieldsSchema = z
  .object({
    sensor_spec: z.enum(SENSOR_STREAM_SPECS),
    start_timestamp: integer(/^\d{1,15}$/),
    end_timestamp: integer(/^\d{1,15}$/),
    sample_count: integer(/^\d{1,9}$/).pipe(z.number().min(1).max(MAX_SAMPLE_COUNT)),
    codec: z.enum(["openzl", "zstd"]),
    codec_format_version: integer(/^\d{1,9}$/),
    platform: z.enum(["android", "ios"]),
    unit: z.literal("m/s^2"),
    sha256: z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase hex SHA-256 digest"),
  })
  .superRefine((fields, ctx) => {
    if (fields.start_timestamp > fields.end_timestamp) {
      ctx.addIssue({ code: "custom", path: ["end_timestamp"], message: "must not be before start_timestamp" })
    } else if (Math.floor(fields.start_timestamp / WINDOW_MS) !== Math.floor(fields.end_timestamp / WINDOW_MS)) {
      ctx.addIssue({
        code: "custom",
        path: ["end_timestamp"],
        message: "must be in the same 5-minute window as start_timestamp",
      })
    }
    if (fields.sample_count * RECORD_BYTES > MAX_FRAME_BYTES) {
      ctx.addIssue({ code: "custom", path: ["sample_count"], message: "sample_count * 20 must not exceed 4 MiB" })
    }
    if (fields.codec_format_version !== CODEC_FORMAT_VERSION[fields.codec]) {
      ctx.addIssue({
        code: "custom",
        path: ["codec_format_version"],
        message: `must be ${CODEC_FORMAT_VERSION[fields.codec]} for codec ${fields.codec}`,
      })
    }
  })
type UploadFields = z.infer<typeof UploadFieldsSchema>
const REQUIRED_FIELDS = Object.keys(UploadFieldsSchema.shape)

const queryInteger = (max: number) => integer(/^\d{1,15}$/).pipe(z.number().max(max))
const ListQuerySchema = z.object({
  sensor_spec: z.enum(SENSOR_STREAM_SPECS),
  from: queryInteger(Number.MAX_SAFE_INTEGER).optional(),
  to: queryInteger(Number.MAX_SAFE_INTEGER).optional(),
  limit: queryInteger(LIST_LIMIT_MAX).pipe(z.number().min(1)).optional(),
  cursor: z.string().optional(),
})

const describeIssues = (error: z.ZodError) =>
  error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")

const sha256Hex = (buf: Buffer) => createHash("sha256").update(buf).digest("hex")

// Resolves once the request body has been read to the end, so the connection stays usable.
function drain(req: Request): Promise<void> {
  return new Promise((resolve) => {
    if (req.readableEnded || req.complete) return resolve()
    req.on("end", () => resolve())
    req.on("close", () => resolve())
    req.on("error", () => resolve())
    req.resume()
  })
}

// Reads the multipart body: the text fields first, then the `frame` file part. Always consumes
// the whole request before it settles, including on a 400 or 413.
function readUpload(req: Request): Promise<{ fields: UploadFields; frame: Buffer }> {
  return new Promise((resolve, reject) => {
    let parser: busboy.Busboy
    try {
      // busboy emits `limit` once a file reaches `fileSize` bytes, even when nothing follows, so allow
      // one extra byte: `limit` then means the frame is over 4 MiB.
      parser = busboy({
        headers: req.headers,
        limits: { files: 1, fields: 12, fileSize: MAX_FRAME_BYTES + 1 },
      })
    } catch (e: any) {
      drain(req).then(() => reject(new HttpError("400.expected-multipart-form-data", e?.message)))
      return
    }

    const raw: Record<string, string> = {}
    let fields: UploadFields | undefined
    let chunks: Buffer[] = []
    let frameSeen = false
    let failure: HttpError | undefined
    const fail = (error: HttpError) => {
      failure = failure ?? error
    }

    parser.on("field", (name, value) => {
      raw[name] = value
    })
    parser.on("file", (name, stream) => {
      if (failure || frameSeen || name !== "frame") {
        if (name !== "frame") fail(new HttpError("400.unexpected-file-part", `unexpected file part "${name}"`))
        stream.resume()
        return
      }
      frameSeen = true
      const missing = REQUIRED_FIELDS.filter((key) => !(key in raw))
      if (missing.length > 0) {
        fail(new HttpError("400.frame-before-fields", `send these fields before the frame: ${missing.join(", ")}`))
        stream.resume()
        return
      }
      const parsed = UploadFieldsSchema.safeParse(raw)
      if (!parsed.success) {
        fail(new HttpError("400.invalid-fields", describeIssues(parsed.error)))
        stream.resume()
        return
      }
      fields = parsed.data
      stream.on("data", (chunk: Buffer) => chunks.push(chunk))
      stream.on("limit", () => {
        fail(new HttpError("413.frame-too-large", "the frame must not exceed 4 MiB"))
        chunks = []
      })
    })
    parser.on("filesLimit", () => fail(new HttpError("400.unexpected-file-part", "send exactly one frame")))
    parser.on("fieldsLimit", () => fail(new HttpError("400.too-many-fields")))
    parser.on("error", (e: any) => {
      req.unpipe(parser)
      fail(new HttpError("400.malformed-multipart", e?.message))
      drain(req).then(() => reject(failure))
    })
    parser.on("close", () => {
      if (failure) return reject(failure)
      if (!frameSeen || !fields) return reject(new HttpError("400.missing-frame", "add a file part named frame"))
      resolve({ fields, frame: Buffer.concat(chunks) })
    })
    req.pipe(parser)
  })
}

// Rejects a frame whose leading magic number doesn't match its declared codec and format version.
function checkCodec(fields: UploadFields, frame: Buffer) {
  const magic = frame.length >= 4 ? frame.readUInt32LE(0) : undefined
  const matches =
    fields.codec === "openzl"
      ? magic !== undefined && magic - OPENZL_MAGIC_BASE === fields.codec_format_version
      : magic === ZSTD_MAGIC
  if (!matches) {
    throw new HttpError(
      "400.codec-mismatch",
      `the frame isn't ${fields.codec} format version ${fields.codec_format_version}`
    )
  }
}

function encodeCursor(doc: any): string {
  return Buffer.from(JSON.stringify([doc.metadata.start_timestamp, doc._id.toHexString()])).toString("base64url")
}

function decodeCursor(cursor: string): { start: number; id: ObjectId } {
  try {
    const [start, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (Number.isSafeInteger(start) && typeof id === "string" && /^[0-9a-f]{24}$/.test(id)) {
      return { start, id: new ObjectId(id) }
    }
  } catch (e) {
    // Not base64url JSON; reject it below.
  }
  throw new HttpError("400.invalid-cursor", "pass the next value from the previous page")
}

function toFrameMetadata(doc: any) {
  const m = doc.metadata
  return {
    id: doc._id.toHexString(),
    sensor_spec: m.sensor_spec,
    start_timestamp: m.start_timestamp,
    end_timestamp: m.end_timestamp,
    sample_count: m.sample_count,
    codec: m.codec,
    codec_format_version: m.codec_format_version,
    platform: m.platform,
    unit: m.unit,
    byte_length: m.byte_length,
    sha256: m.sha256,
    upload_date: doc.uploadDate.toISOString(),
  }
}

export class SensorStreamService {
  public static _name = "SensorStream"
  public static Router = Router()

  // Authorizes the acting user for a participant and returns the participant ID, with `me` resolved.
  // Only the participant and the researchers above them qualify: unlike `sensor_event`, there's no
  // `sibling` rule, because two participants of one study are siblings and must not see each other.
  public static async authorize(
    actingUserContext: ActingUserContext,
    participant_id: string,
    apiKeyAccessLevel: ApiKeyAccessLevels
  ): Promise<string> {
    await _authorize(actingUserContext, ["self", "parent"], participant_id, apiKeyAccessLevel)
    return participant_id === "me" ? (actingUserContext.user.origin as string) : participant_id
  }

  // Stores a frame unless the same frame is already stored. Returns `{id}` or `{id, duplicate: true}`.
  public static async create(participant_id: string, fields: UploadFields, frame: Buffer) {
    if (sha256Hex(frame) !== fields.sha256) {
      throw new HttpError("400.sha256-mismatch", "sha256 doesn't match the frame bytes")
    }
    checkCodec(fields, frame)

    const db: Db = MongoClientDB
    const files = db.collection(`${SENSOR_STREAM_BUCKET}.files`)
    const sameStart = {
      "metadata.participant_id": participant_id,
      "metadata.sensor_spec": fields.sensor_spec,
      "metadata.start_timestamp": fields.start_timestamp,
    }
    // A retry is a duplicate; different bytes for the same start are a conflict.
    const resolveExisting = async () => {
      const existing = await files
        .find(sameStart, { readPreference: ReadPreference.primary, projection: { "metadata.sha256": 1 } })
        .toArray()
      const same = existing.find((doc) => doc.metadata?.sha256 === fields.sha256)
      if (same) return { id: same._id.toHexString(), duplicate: true }
      if (existing.length > 0) {
        throw new HttpError("409.frame-conflict", "a different frame is already stored for this start_timestamp")
      }
      return undefined
    }

    const existing = await resolveExisting()
    if (existing) return existing

    const metadata = {
      participant_id,
      sensor_spec: fields.sensor_spec,
      start_timestamp: fields.start_timestamp,
      end_timestamp: fields.end_timestamp,
      sample_count: fields.sample_count,
      codec: fields.codec,
      codec_format_version: fields.codec_format_version,
      platform: fields.platform,
      unit: fields.unit,
      byte_length: frame.length,
      sha256: fields.sha256,
    }
    const upload = sensorStreamBucket(db).openUploadStream(
      `${participant_id}/${fields.sensor_spec}/${fields.start_timestamp}`,
      { metadata }
    )
    try {
      upload.end(frame)
      await finished(upload)
    } catch (e: any) {
      // GridFS writes the chunks before the files document, so a lost race leaves orphaned chunks.
      await db.collection(`${SENSOR_STREAM_BUCKET}.chunks`).deleteMany({ files_id: upload.id })
      if (e?.code !== 11000) throw e
      const winner = await resolveExisting()
      if (winner) return winner
      throw e
    }
    return { id: upload.id.toHexString() }
  }

  // Lists the metadata of frames that overlap [from, to), sorted by start_timestamp, then id.
  public static async list(participant_id: string, query: unknown) {
    const parsed = ListQuerySchema.safeParse(query)
    if (!parsed.success) throw new HttpError("400.invalid-query", describeIssues(parsed.error))
    const { sensor_spec, from = 0, to = Date.now(), limit = LIST_LIMIT_MAX, cursor } = parsed.data

    const filter: any = {
      "metadata.participant_id": participant_id,
      "metadata.sensor_spec": sensor_spec,
      "metadata.start_timestamp": { $lt: to },
      "metadata.end_timestamp": { $gte: from },
    }
    if (cursor !== undefined) {
      const after = decodeCursor(cursor)
      filter.$or = [
        { "metadata.start_timestamp": { $gt: after.start } },
        { "metadata.start_timestamp": after.start, _id: { $gt: after.id } },
      ]
    }
    const docs = await (MongoClientDB as Db)
      .collection(`${SENSOR_STREAM_BUCKET}.files`)
      .find(filter)
      .sort({ "metadata.start_timestamp": 1, _id: 1 })
      .limit(limit + 1)
      .maxTimeMS(60000)
      .toArray()
    const page = docs.slice(0, limit)
    return {
      data: page.map(toFrameMetadata),
      next: docs.length > limit ? encodeCursor(page[page.length - 1]) : null,
    }
  }

  // Finds a frame of the participant. Throws 404 when the ID is malformed or belongs to someone else.
  public static async get(participant_id: string, file_id: string) {
    if (!/^[0-9a-f]{24}$/i.test(file_id)) throw new HttpError("404.frame-not-found")
    const doc = await (MongoClientDB as Db)
      .collection(`${SENSOR_STREAM_BUCKET}.files`)
      .findOne({ _id: new ObjectId(file_id), "metadata.participant_id": participant_id })
    if (!doc) throw new HttpError("404.frame-not-found")
    return doc
  }
}

function sendError(res: Response, e: any) {
  const message: string = e?.message ?? "500.unknown-error"
  const status = parseInt(message.split(".")[0]) || 500
  if (status === 500) console.error("SensorStream failure", e)
  res
    .status(status)
    .json(e instanceof HttpError && e.detail ? { error: message, detail: e.detail } : { error: message })
}

SensorStreamService.Router.post(
  "/participant/:participant_id/sensor-stream",
  configureAuth([AuthFlag.allowMobileToken]),
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      // Authorize before reading the body, so an unauthorized client never uploads 4 MiB.
      const participant_id = await SensorStreamService.authorize(
        res.locals.actingUserContext,
        req.params.participant_id,
        ApiKeyAccessLevels.SYSTEM_ADMIN
      )
      const { fields, frame } = await readUpload(req)
      res.json({ data: await SensorStreamService.create(participant_id, fields, frame) })
    } catch (e: any) {
      sendError(res, e)
    }
  }
)

SensorStreamService.Router.get(
  "/participant/:participant_id/sensor-stream",
  // Reads take an `x-api-key` (or a dashboard session), never a mobile token.
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      const participant_id = await SensorStreamService.authorize(
        res.locals.actingUserContext,
        req.params.participant_id,
        ApiKeyAccessLevels.STANDARD
      )
      res.json(await SensorStreamService.list(participant_id, req.query))
    } catch (e: any) {
      sendError(res, e)
    }
  }
)

SensorStreamService.Router.get(
  "/participant/:participant_id/sensor-stream/:file_id",
  // Reads take an `x-api-key` (or a dashboard session), never a mobile token.
  authenticateSession,
  async (req: Request, res: Response) => {
    res.header(ApiResponseHeaders)
    try {
      const participant_id = await SensorStreamService.authorize(
        res.locals.actingUserContext,
        req.params.participant_id,
        ApiKeyAccessLevels.STANDARD
      )
      const doc = await SensorStreamService.get(participant_id, req.params.file_id)
      res.set({
        "Content-Type": "application/octet-stream",
        "Content-Length": String(doc.length),
        ETag: `"${doc.metadata.sha256}"`,
      })
      await pipeline(sensorStreamBucket(MongoClientDB).openDownloadStream(doc._id), res)
    } catch (e: any) {
      if (res.headersSent) {
        console.error("SensorStream download failed", e)
        res.destroy()
      } else {
        sendError(res, e)
      }
    }
  }
)
