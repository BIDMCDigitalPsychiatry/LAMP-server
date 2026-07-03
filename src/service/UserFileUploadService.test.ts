import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mockClient } from "aws-sdk-client-mock"
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListMultipartUploadsCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { AwsFileUploadService } from "./UserFileUploadService"

// getSignedUrl is a standalone function (not a client command), so mock it
// directly to keep presigned-URL assertions deterministic and offline.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(
    async (_client: unknown, command: any) =>
      `https://signed.example/${command.input.Key}?partNumber=${command.input.PartNumber}`,
  ),
}))
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Mock = mockClient(S3Client)
const cfg = { userUploadsBucket: "test-bucket", userUploadsBucketRegion: "us-east-1" }

beforeEach(() => {
  s3Mock.reset()
  vi.mocked(getSignedUrl).mockClear()
})
afterEach(() => {
  vi.clearAllMocks()
})

describe("AwsFileUploadService.initiate", () => {
  it("sends CreateMultipartUpload with the bucket, key, content type and metadata", async () => {
    s3Mock.on(CreateMultipartUploadCommand).resolves({ UploadId: "upload-123" })

    await new AwsFileUploadService(cfg).initiate("videos/vid-upl-1", "video/mp4", { LAMP_PARTICIPANT_ID: "part1" })

    const calls = s3Mock.commandCalls(CreateMultipartUploadCommand)
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "videos/vid-upl-1",
      ContentType: "video/mp4",
      Metadata: { LAMP_PARTICIPANT_ID: "part1" },
    })
  })

  it("throws when S3 returns no UploadId", async () => {
    s3Mock.on(CreateMultipartUploadCommand).resolves({})
    await expect(new AwsFileUploadService(cfg).initiate("videos/x", "video/mp4", {})).rejects.toThrow(
      /Could not initiate multipart upload/,
    )
  })
})

describe("AwsFileUploadService.complete", () => {
  it("looks up the upload then completes it with parts sorted by part number", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-1", Key: "videos/v" }] })
    s3Mock.on(CompleteMultipartUploadCommand).resolves({ Location: "https://s3/done" })

    await new AwsFileUploadService(cfg).complete("videos/v", [
      { partNumber: 2, etag: '"etag-2"' },
      { partNumber: 1, etag: '"etag-1"' },
    ])

    const calls = s3Mock.commandCalls(CompleteMultipartUploadCommand)
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "videos/v",
      UploadId: "u-1",
      MultipartUpload: {
        Parts: [
          { PartNumber: 1, ETag: '"etag-1"' },
          { PartNumber: 2, ETag: '"etag-2"' },
        ],
      },
    })
  })

  it("throws when there is no in-progress upload for the path", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [] })
    await expect(new AwsFileUploadService(cfg).complete("videos/missing", [])).rejects.toThrow(
      /Could not find a multipart upload/,
    )
  })
})

describe("AwsFileUploadService.abort", () => {
  it("aborts when exactly one upload is found", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-9", Key: "videos/v" }] })
    s3Mock.on(AbortMultipartUploadCommand).resolves({})

    await new AwsFileUploadService(cfg).abort("videos/v")

    const calls = s3Mock.commandCalls(AbortMultipartUploadCommand)
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0].input).toMatchObject({ Bucket: "test-bucket", Key: "videos/v", UploadId: "u-9" })
  })

  it("is a no-op when no upload is found (Uploads undefined)", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({})
    await expect(new AwsFileUploadService(cfg).abort("videos/none")).resolves.toBeUndefined()
    expect(s3Mock.commandCalls(AbortMultipartUploadCommand)).toHaveLength(0)
  })

  it("throws when more than one multipart upload matches the prefix", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({
      Uploads: [
        { UploadId: "u-1", Key: "videos/v" },
        { UploadId: "u-2", Key: "videos/v2" },
      ],
    })
    await expect(new AwsFileUploadService(cfg).abort("videos/v")).rejects.toThrow(/Multiple MultipartUploads/)
  })
})

describe("AwsFileUploadService.getPresignedUrlInfoForParts", () => {
  it("returns a signed PUT url per requested part", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [{ UploadId: "u-1", Key: "videos/v" }] })

    const info = await new AwsFileUploadService(cfg).getPresignedUrlInfoForParts("videos/v", [1, 2], 600)

    expect(getSignedUrl).toHaveBeenCalledTimes(2)
    expect(info).toEqual([
      { method: "PUT", partNumber: 1, presignedUrl: "https://signed.example/videos/v?partNumber=1" },
      { method: "PUT", partNumber: 2, presignedUrl: "https://signed.example/videos/v?partNumber=2" },
    ])
  })

  it("throws when the upload is missing", async () => {
    s3Mock.on(ListMultipartUploadsCommand).resolves({ Uploads: [] })
    await expect(new AwsFileUploadService(cfg).getPresignedUrlInfoForParts("videos/missing", [1], 600)).rejects.toThrow(
      /Could not find a multipart upload/,
    )
  })
})
