import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AudioUploadsService } from "./AudioUploadService"
import type { PresignedUrlInfo, UserFileUploadService } from "./UserFileUploadService"

const PART_SIZE = 5 * 1024 * 1024 // 5_242_880 — the minimum allowed part size
const validConfig = { presignedUrlTtlSeconds: 900, uploadPartSizeBytes: PART_SIZE }

function makeUploadServiceMock(): UserFileUploadService {
  return {
    initiate: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
    getPresignedUrlInfoForParts: vi.fn().mockResolvedValue([] as PresignedUrlInfo[]),
  }
}

describe("AudioUploadsService constructor validation", () => {
  it("accepts the lower-bound part size (5 MiB)", () => {
    expect(
      () => new AudioUploadsService({ ...validConfig, uploadPartSizeBytes: 5_242_880 }, makeUploadServiceMock()),
    ).not.toThrow()
  })

  it("accepts the upper-bound part size (10 MiB)", () => {
    expect(
      () => new AudioUploadsService({ ...validConfig, uploadPartSizeBytes: 10_485_760 }, makeUploadServiceMock()),
    ).not.toThrow()
  })

  it("throws below the minimum part size", () => {
    expect(
      () => new AudioUploadsService({ ...validConfig, uploadPartSizeBytes: 5_242_879 }, makeUploadServiceMock()),
    ).toThrow()
  })

  it("throws above the maximum part size", () => {
    expect(
      () => new AudioUploadsService({ ...validConfig, uploadPartSizeBytes: 10_485_761 }, makeUploadServiceMock()),
    ).toThrow()
  })

  it("throws for a non-integer part size", () => {
    expect(
      () => new AudioUploadsService({ ...validConfig, uploadPartSizeBytes: 5_242_880.5 }, makeUploadServiceMock()),
    ).toThrow()
  })
})

describe("calculatePartRanges", () => {
  const svc = new AudioUploadsService(validConfig, makeUploadServiceMock())

  it("throws via invariant when fileSizeBytes <= 0", () => {
    expect(() => svc.calculatePartRanges(0)).toThrow()
    expect(() => svc.calculatePartRanges(-1)).toThrow()
  })

  it("returns a single part smaller than the part size, clamped to the last byte", () => {
    expect(svc.calculatePartRanges(1000)).toEqual([{ partNumber: 1, byteRange: { start: 0, end: 999 } }])
  })

  it("returns one part for an exact single-part size", () => {
    const parts = svc.calculatePartRanges(PART_SIZE)
    expect(parts).toHaveLength(1)
    expect(parts[0]).toEqual({ partNumber: 1, byteRange: { start: 0, end: PART_SIZE - 1 } })
  })

  it("splits an exact multiple into N full parts", () => {
    const parts = svc.calculatePartRanges(PART_SIZE * 3)
    expect(parts).toHaveLength(3)
    expect(parts[0].byteRange).toEqual({ start: 0, end: PART_SIZE - 1 })
    expect(parts[1].byteRange).toEqual({ start: PART_SIZE, end: 2 * PART_SIZE - 1 })
    expect(parts[2].byteRange).toEqual({ start: 2 * PART_SIZE, end: 3 * PART_SIZE - 1 })
  })

  it("clamps the final part on a remainder size", () => {
    const size = PART_SIZE * 2 + 123
    const parts = svc.calculatePartRanges(size)
    expect(parts).toHaveLength(3)
    expect(parts[2]).toEqual({ partNumber: 3, byteRange: { start: 2 * PART_SIZE, end: size - 1 } })
  })
})

describe("initiate", () => {
  it("mints an aud-upl- id and delegates to uploadService.initiate with the audio/<id> path", async () => {
    const upload = makeUploadServiceMock()
    const svc = new AudioUploadsService(validConfig, upload)
    const metadata = { LAMP_PARTICIPANT_ID: "part1", FILE_SIZE_BYTES: "1000" }

    const id = await svc.initiate(metadata)

    expect(id).toMatch(/^aud-upl-[0-9a-f-]{36}$/)
    expect(upload.initiate).toHaveBeenCalledTimes(1)
    expect(upload.initiate).toHaveBeenCalledWith(`audio/${id}`, "audio/webm", metadata)
  })
})

describe("getUploadUrlParts", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("stamps presignedUrlExpiration = floor(now/1000) + ttl and forwards the ttl", async () => {
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"))
    const expectedExpiration = Math.floor(Date.now() / 1000) + 900

    const upload = makeUploadServiceMock()
    vi.mocked(upload.getPresignedUrlInfoForParts).mockResolvedValue([
      { partNumber: 1, method: "PUT", presignedUrl: "https://signed/1" },
      { partNumber: 2, method: "PUT", presignedUrl: "https://signed/2" },
    ])

    const svc = new AudioUploadsService(validConfig, upload)
    const result = await svc.getUploadUrlParts("aud-upl-abc", [1, 2])

    expect(upload.getPresignedUrlInfoForParts).toHaveBeenCalledWith("audio/aud-upl-abc", [1, 2], 900)
    expect(result).toEqual([
      { partNumber: 1, method: "PUT", presignedUrl: "https://signed/1", presignedUrlExpiration: expectedExpiration },
      { partNumber: 2, method: "PUT", presignedUrl: "https://signed/2", presignedUrlExpiration: expectedExpiration },
    ])
  })
})
