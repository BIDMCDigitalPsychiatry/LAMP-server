import { randomUUID } from "crypto";
import { range } from "lodash";
import { invariant } from "../utils/invariant";
import { LampUploadId, PartEtagInfo, PresignedUrlInfo, UserFileUploadService } from "./UserFileUploadService";

//----------------------------------------------------------
// Constants
//----------------------------------------------------------

const BYTES_PER_PART_ACCEPTABLE_RANGE = {
  min: 5242880,
  max: 10485760
}

//----------------------------------------------------------
// Types
//----------------------------------------------------------

export interface UserUploadsServiceConfig {
  presignedUrlTtlSeconds: number,
  uploadPartSizeBytes: number,
}

type InitiateMetadataRequiredKeys = "FILE_SIZE_BYTES"
  | "LAMP_PARTICIPANT_ID"
  | "LAMP_RESEARCHER_ID"
  | "LAMP_STUDY_ID"

type InitiateMetadataOptionalKeys = never

export type InitiateMetadata = Record<InitiateMetadataRequiredKeys, string> & Partial<Record<InitiateMetadataOptionalKeys, string>>


export type PresignedUrlInfoWithExpiration = PresignedUrlInfo & {
  presignedUrlExpiration: number
}

export interface ByteRange {
  start: number,
  end: number
}

export interface Part {
  partNumber: number
  byteRange: ByteRange
}


//----------------------------------------------------------
// Service
//----------------------------------------------------------
//
// Shared facade over a `UserFileUploadService` (the S3-backed multipart
// upload driver). Concrete subclasses only supply the three values that
// differ per media type: where the object is stored, how its upload id is
// prefixed, and its content type.

export abstract class AbstractUserUploadService {

  // Per-media-type customization points, supplied by subclasses.
  protected abstract readonly storagePrefix: string
  protected abstract readonly idPrefix: string
  protected abstract readonly contentType: string

  private readonly config: UserUploadsServiceConfig;
  private readonly uploadService : UserFileUploadService;

  constructor(config: UserUploadsServiceConfig, userFileUploadService: UserFileUploadService) {

    if (
      ( ! Number.isInteger(config.uploadPartSizeBytes) )
      || config.uploadPartSizeBytes < BYTES_PER_PART_ACCEPTABLE_RANGE.min
      || config.uploadPartSizeBytes > BYTES_PER_PART_ACCEPTABLE_RANGE.max
    ) {
        throw new Error(`Invalid config for ${this.constructor.name}. Upload part size must be >= 5242880 (5 mb) or <= 10485760 (10 mb)`)
    }

    this.config = config
    this.uploadService = userFileUploadService;
  }

  private getStoragePathForUpload(uploadId: LampUploadId): string {
    return `${this.storagePrefix}/${uploadId}`
  }

  private generateUploadId(): LampUploadId {
    return `${this.idPrefix}-${ randomUUID() }`
  }

  public async initiate(metadata: InitiateMetadata): Promise<LampUploadId> {
    const uploadId = this.generateUploadId()
    const uploadPath = this.getStoragePathForUpload(uploadId)

    await this.uploadService.initiate(uploadPath, this.contentType, metadata)

    return uploadId
  }

  public async complete(id: LampUploadId, etags: PartEtagInfo[]) : Promise<void> {
    await this.uploadService.complete(
      this.getStoragePathForUpload(id),
      etags
    )
  }

  public async abort(id: LampUploadId) : Promise<void> {
    await this.uploadService.abort(this.getStoragePathForUpload(id))

    return
  }

  public async getUploadUrlParts(id: LampUploadId, parts: number[]) : Promise<PresignedUrlInfoWithExpiration[]> {
    const path = this.getStoragePathForUpload(id)

    const nowUnix = Math.floor(Date.now() / 1000);
    const expirationUnix = nowUnix + this.config.presignedUrlTtlSeconds

    const presignedUrlInfo = await this.uploadService.getPresignedUrlInfoForParts(path, parts, this.config.presignedUrlTtlSeconds)

    return presignedUrlInfo.map<PresignedUrlInfoWithExpiration>((el) => {
      return {
        ...el,
        presignedUrlExpiration: expirationUnix
      }
    })
  }

  public calculatePartRanges(fileSizeBytes: number) : Part[] {
    invariant(fileSizeBytes > 0, `Error calling ${this.constructor.name}.calculatePartRanges. File size must be > 0, but file size was ${fileSizeBytes}`)

    const partCount = Math.ceil(fileSizeBytes / this.config.uploadPartSizeBytes)
    const lastByte = fileSizeBytes - 1

    return range(0, partCount).map<Part>((idx) => {
      const partNumber = idx + 1

      const chunkStart = idx * this.config.uploadPartSizeBytes
      const chunkEnd = (idx + 1) * this.config.uploadPartSizeBytes - 1

      return {
        partNumber,
        byteRange: {
          start: chunkStart,
          end: (lastByte <= chunkEnd ? lastByte : chunkEnd)
        }
      }
    })
  }
}
