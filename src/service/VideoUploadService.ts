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

export interface VideoUploadsServiceConfig {
  presignedUrlTtlSeconds: number,
  uploadPartSizeBytes: number,
}

type InitiateMetadataRequiredKeys = "LAMP_PARTICIPANT_ID" 
  | "FILE_SIZE_BYTES"

type InitiateMetadataOptionalKeys = "LAMP_PARTICIPANT_ID" 
  | "FILE_SIZE_BYTES"

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

export class VideoUploadsService {

  private readonly config: VideoUploadsServiceConfig; 
  private readonly uploadService : UserFileUploadService;

  constructor(config: VideoUploadsServiceConfig, userFileUploadService: UserFileUploadService) {

    if (
      ( ! Number.isInteger(config.uploadPartSizeBytes) )
      || config.uploadPartSizeBytes < BYTES_PER_PART_ACCEPTABLE_RANGE.min
      || config.uploadPartSizeBytes > BYTES_PER_PART_ACCEPTABLE_RANGE.max
    ) {
        throw new Error(`Invalid config for ${VideoUploadsService.name}. Upload part size must be >= 5242880 (5 mb) or <= 10485760 (10 mb)`)
    }

    this.config = config
    this.uploadService = userFileUploadService;
  }

  // private async getUploadInfo(id: LampUploadId) : Promise<> {}

  private getStoragePathForUpload(uploadId: LampUploadId): string {
    return `videos/${uploadId}`
  }

  private generateUploadId(): LampUploadId {
    return `vid-upl-${ randomUUID() }`
  }

  public async initiate(metadata: InitiateMetadata): Promise<LampUploadId> {
    const uploadId = this.generateUploadId()
    const uploadPath = this.getStoragePathForUpload(uploadId)

    await this.uploadService.initiate(uploadPath, "video/mp4", metadata)

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
    invariant(fileSizeBytes > 0, `Error calling ${VideoUploadsService.name}.calculatePartRanges. File size must be > 0, but file size was ${fileSizeBytes}`)

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
