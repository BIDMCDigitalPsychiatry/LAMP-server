import { AwsFileUploadService } from "./service/UserFileUploadService";
import { VideoUploadsService } from "./service/VideoUploadService";

export interface ApplicationServices {
  // audioUploadService: AudioUploadService
  videoUploadService: VideoUploadsService
}

export interface ApplicationContext {
  services: ApplicationServices
}

export function createRequestContext() : ApplicationContext {

  // Services

  const fileUploadService = new AwsFileUploadService({
    userUploadsBucket: "dev-user-uploads-unsanitized-544847369688-us-east-2-an",
    userUploadsBucketRegion: "us-east-2"
  })

  const videoUploadService = new VideoUploadsService({
    presignedUrlTtlSeconds: 300, // 60s * 5 mins
    uploadPartSizeBytes: 5242880 // 5 mb, binary
  }, fileUploadService)

  // const audioUploadService = new AudioUploadsService({
  //   presignedUrlTtlSeconds: 300, // 60s * 5 mins
  //   uploadPartSizeBytes: 5242880 // 5 mb, binary
  // }, fileUploadService)

  return {
    services: {
      videoUploadService
    }
  }
}