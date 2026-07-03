import { AbortMultipartUploadCommand, AbortMultipartUploadCommandInput, CompletedPart, CompleteMultipartUploadCommand, CompleteMultipartUploadCommandInput, CreateMultipartUploadCommand, CreateMultipartUploadCommandInput, ListMultipartUploadsCommand, ListMultipartUploadsCommandInput, MultipartUpload, S3Client, S3ClientConfig, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sortBy } from "lodash";

//----------------------------------------------------------
// Types
//----------------------------------------------------------

export type LampUploadId = string

export interface LampUploadDetails {}

export interface PartEtagInfo {
  partNumber: number,
  etag: string
}

export interface AwsFileUploadServiceConfig {
  userUploadsBucket: string
  userUploadsBucketRegion: string
}


//----------------------------------------------------------
// Service
//----------------------------------------------------------

export interface UserFileUploadService {
  initiate(path: string, contentType: string, metadata: Record<string, string>) : Promise<void>
  complete(path: string, etags: PartEtagInfo[]) : Promise<void>
  getPresignedUrlInfoForParts(path: string, parts: number[], expirationSeconds: number): Promise<PresignedUrlInfo[]>
  abort(path: string) : Promise<void>
}

export interface PresignedUrlInfo {
  partNumber: number,
  method: 'POST' | 'PUT'
  presignedUrl: string,
}

export class AwsFileUploadService implements UserFileUploadService {

  private readonly config: AwsFileUploadServiceConfig;
  private readonly s3 : S3Client;

  constructor(config: AwsFileUploadServiceConfig) {
    this.config = config;
    this.s3 = new S3Client({
      region: config.userUploadsBucketRegion,
    } as S3ClientConfig)
  }

  public async initiate(path: string, contentType: string, metadata: Record<string, string>) : Promise<void> {

    const { UploadId } = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.config.userUploadsBucket,
        Key: path,
        ContentType: contentType,
        Metadata: metadata
      } as CreateMultipartUploadCommandInput)
    );
    
    if (UploadId === undefined) {
      throw new Error(`Could not initiate multipart upload when calling ${AwsFileUploadService.name}.initiate for path '${path}'`)
    }

    return

  }

  public async complete(path: string, etags: PartEtagInfo[]) : Promise<void> {
    const upload = await this.findExactlyOneMultipartUploadByPath(path);

    if (upload === undefined || upload.UploadId === undefined) {
      throw new Error(`Could not find a multipart upload when calling ${AwsFileUploadService.name}.complete with the path '${path}'.`)
    }

    const parts = sortBy(etags.map<CompletedPart>((el) => {
      return {
        PartNumber: el.partNumber,
        ETag: el.etag
      }
    }), ["PartNumber"])

    const response = await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.config.userUploadsBucket,
        Key: path,
        UploadId: upload.UploadId,
        MultipartUpload: {
          Parts: parts
        }
      } as CompleteMultipartUploadCommandInput)
    );
    
    return
  }

  private async getPresignedUrlForPart(key: string, uploadId: string, partNumber: number, ttl: number) : Promise<string> {

    const command = new UploadPartCommand({
      Bucket: this.config.userUploadsBucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber, // Must be between 1 and 10,000
    });

    return await getSignedUrl(this.s3, command, { expiresIn: ttl });

  }

  public async getPresignedUrlInfoForParts(path: string, parts: number[], ttlSeconds: number): Promise<PresignedUrlInfo[]> {

    const upload = await this.findExactlyOneMultipartUploadByPath(path)
    if (upload === undefined || upload.UploadId === undefined) {
      throw new Error(`Could not find a multipart upload with path '${path}' when calling ${AwsFileUploadService.name}.getPresignedUrlInfoForParts.`)
    }

    return Promise.all(
      parts.map(async (partNumber) => {
        const url = await this.getPresignedUrlForPart(path, upload.UploadId!, partNumber, ttlSeconds)

        return {
          method: 'PUT',
          partNumber: partNumber,
          presignedUrl: url
        }
      })
    )
  }

  public async abort(path: string) : Promise<void> {

    const upload = await this.findExactlyOneMultipartUploadByPath(path)
    if (upload === undefined) return

    const awsUploadId = upload.UploadId
    if (awsUploadId === undefined) {
      throw new Error(`MultipartUpload object unexpectedly did not have an UploadId when calling ${AwsFileUploadService.name}.abort for path '${path}'`)
    }
;
    await this.s3.send(new AbortMultipartUploadCommand({
      Bucket: this.config.userUploadsBucket,
      Key: path,
      UploadId: awsUploadId
    } as AbortMultipartUploadCommandInput));

    return
  }

  private async findExactlyOneMultipartUploadByPath(uniquePath: string): Promise<MultipartUpload | undefined> {
    const { Uploads } = await this.s3.send(new ListMultipartUploadsCommand({
      Bucket: this.config.userUploadsBucket,
      Prefix: uniquePath,
      MaxUploads: 2
    } as ListMultipartUploadsCommandInput))

    if (Uploads === undefined) {
      return
    }

    if (Uploads.length > 1) {
      throw new Error(`Error calling ${AwsFileUploadService.name}.abort with path '${uniquePath}'. Multiple MultipartUploads with that path prefix were found.`)
    }

    return Uploads[0]
  }

}