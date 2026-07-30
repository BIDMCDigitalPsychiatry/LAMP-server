import { AbstractUserUploadService } from "./AbstractUserUploadService";

//----------------------------------------------------------
// Types
//----------------------------------------------------------
//
// Shared upload types live on AbstractUserUploadService; they are re-exported
// here so existing importers (e.g. VideoUploadController) keep working.

export type {
  UserUploadsServiceConfig as VideoUploadsServiceConfig,
  InitiateMetadata,
  PresignedUrlInfoWithExpiration,
  ByteRange,
  Part,
} from "./AbstractUserUploadService";

//----------------------------------------------------------
// Service
//----------------------------------------------------------

export class VideoUploadsService extends AbstractUserUploadService {
  protected readonly storagePrefix = "videos"
  protected readonly idPrefix = "vid-upl"
  protected readonly contentType = "video/mp4"
}
