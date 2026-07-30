import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import { mockClient } from "aws-sdk-client-mock"
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListMultipartUploadsCommand,
  S3Client,
} from "@aws-sdk/client-s3"

// Replace the real auth middleware with a pass-through BEFORE the router is
// imported (the router imports checkAuth at module load). vi.mock is hoisted
// above the imports below, so this takes effect first. The router uses
// `checkAuth` (Basic auth) for the upload routes; bypass it so these tests
// exercise validation + controller + service rather than auth.
vi.mock("../../src/middlewares/tempFileUploadAuth", () => ({
  checkAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Deterministic, offline presigned URLs.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(
    async (_client: unknown, command: any) =>
      `https://signed.example/${command.input.Key}?partNumber=${command.input.PartNumber}`,
  ),
}))

import { buildUploadTestApp } from "../support/uploadTestApp"
import {
  completeResponseSchema,
  initiateResponseSchema,
  refreshUrlsResponseSchema,
} from "../../src/schemas/fileUpload"

const s3Mock = mockClient(S3Client)
const app = buildUploadTestApp()

const PART_SIZE = 5 * 1024 * 1024

beforeEach(() => {
  s3Mock.reset()
})
afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /participant/:participantId/video/upload/initiate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the upload id + merged parts and creates the multipart upload", async () => {
    s3Mock.on(CreateMultipartUploadCommand).resolves({ UploadId: "u-1" })
    // getUploadUrlParts -> getPresignedUrlInfoForParts -> ListMultipartUploads
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-1", Key: "videos/x" }] })

    const fileSize = PART_SIZE * 2 + 10 // two full parts + a 10-byte tail => 3 parts
    const expectedExpiration = Math.floor(Date.now() / 1000) + 900

    const res = await request(app)
      .post("/participant/part123/video/upload/initiate")
      .send({ metadata: { size: fileSize } })
      .expect(200)

    // Response-shape contract: throws (failing the test) on any drift.
    initiateResponseSchema.parse(res.body)

    expect(res.body.id).toMatch(/^vid-upl-/)
    expect(res.body.parts).toHaveLength(3)
    expect(res.body.parts[0]).toMatchObject({
      partNumber: 1,
      byteRange: { start: 0, end: PART_SIZE - 1 },
      method: "PUT",
      presignedUrlExpiration: expectedExpiration,
    })
    expect(res.body.parts[0].presignedUrl).toContain("partNumber=1")

    const createCalls = s3Mock.commandCalls(CreateMultipartUploadCommand)
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0].args[0].input).toMatchObject({
      Bucket: "test-bucket",
      ContentType: "video/mp4",
      // S3 object metadata values are strings; the controller stringifies the size.
      Metadata: { LAMP_PARTICIPANT_ID: "part123", FILE_SIZE_BYTES: String(fileSize) },
    })
  })
})

describe("POST /participant/:participantId/video/upload/complete", () => {
  it("returns 202 and completes the multipart upload with parts sorted by part number", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-1", Key: "videos/vid-upl-9" }] })
    s3Mock.on(CompleteMultipartUploadCommand).resolves({})

    const res = await request(app)
      .post("/participant/part123/video/upload/complete")
      .send({
        id: "vid-upl-9",
        parts: [
          { partNumber: 2, etag: '"etag-2"' },
          { partNumber: 1, etag: '"etag-1"' },
        ],
      })
      .expect(202)

    completeResponseSchema.parse(res.body)
    expect(res.body).toEqual({})

    const completeCalls = s3Mock.commandCalls(CompleteMultipartUploadCommand)
    expect(completeCalls).toHaveLength(1)
    expect(completeCalls[0].args[0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "videos/vid-upl-9",
      UploadId: "u-1",
      MultipartUpload: {
        Parts: [
          { PartNumber: 1, ETag: '"etag-1"' },
          { PartNumber: 2, ETag: '"etag-2"' },
        ],
      },
    })
  })
})

describe("POST /participant/:participantId/video/upload/refresh-urls", () => {
  it("returns 200 with refreshed presigned URLs matching the response contract", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-1", Key: "videos/vid-upl-9" }] })

    const res = await request(app)
      .post("/participant/part123/video/upload/refresh-urls")
      .send({ id: "vid-upl-9", partNumbers: [1, 2] })
      .expect(200)

    refreshUrlsResponseSchema.parse(res.body)
    expect(res.body.id).toBe("vid-upl-9")
    expect(res.body.parts).toHaveLength(2)
    expect(res.body.parts.map((p: { partNumber: number }) => p.partNumber)).toEqual([1, 2])
  })
})

describe("request validation (rejects malformed input with 400)", () => {
  it("rejects initiate when metadata.size is not positive", async () => {
    const res = await request(app)
      .post("/participant/part123/video/upload/initiate")
      .send({ metadata: { size: 0 } })
      .expect(400)

    expect(res.body.error).toBe("ValidationError")
    expect(s3Mock.calls()).toHaveLength(0) // never reached the service
  })

  it("rejects complete when an etag is not quote-wrapped", async () => {
    const res = await request(app)
      .post("/participant/part123/video/upload/complete")
      .send({ id: "vid-upl-9", parts: [{ partNumber: 1, etag: "no-quotes" }] })
      .expect(400)

    expect(res.body.error).toBe("ValidationError")
    expect(s3Mock.calls()).toHaveLength(0)
  })

  it("rejects when participantId param is too short", async () => {
    const res = await request(app)
      .post("/participant/x/video/upload/abort")
      .send({ id: "vid-upl-9" })
      .expect(400)

    expect(res.body.error).toBe("ValidationError")
  })
})
