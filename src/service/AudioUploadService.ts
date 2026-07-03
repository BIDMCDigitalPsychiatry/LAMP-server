import { AbstractUserUploadService } from "./AbstractUserUploadService";

//----------------------------------------------------------
// Types
//----------------------------------------------------------
//
// Shared upload types live on AbstractUserUploadService; they are re-exported
// here so existing importers (e.g. AudioUploadController) keep working.

export type {
  UserUploadsServiceConfig as AudioUploadsServiceConfig,
  InitiateMetadata,
  PresignedUrlInfoWithExpiration,
  ByteRange,
  Part,
} from "./AbstractUserUploadService";

//----------------------------------------------------------
// Service
//----------------------------------------------------------

export class AudioUploadsService extends AbstractUserUploadService {
  protected readonly storagePrefix = "audio"
  protected readonly idPrefix = "aud-upl"
  protected readonly contentType = "audio/webm"
}
