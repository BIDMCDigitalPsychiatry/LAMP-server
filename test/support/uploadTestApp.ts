import express, { type Express, type NextFunction, type Request, type Response } from "express"
import { createVideoUploadRouter } from "../../src/routers/VideoUploadRouter"
import { createAudioUploadRouter } from "../../src/routers/AudioUploadRouter"
import { VideoUploadsService } from "../../src/service/VideoUploadService"
import { AudioUploadsService } from "../../src/service/AudioUploadService"
import { AwsFileUploadService } from "../../src/service/UserFileUploadService"

/**
 * Builds a test-only Express app that mounts the REAL audio- and video-upload
 * routers, controllers and services, but injects the `req.context` the
 * controllers read.
 *
 * In `src/` nothing populates `req.context` yet (the feature is intentionally
 * left half-wired), so the production endpoints currently throw on
 * `invariant(req.context)`. Rather than modify the feature code, integration
 * tests inject the dependency here. S3 is intercepted separately by
 * aws-sdk-client-mock, and `authenticateSession` is replaced via `vi.mock` in the
 * test file, so this app exercises validation + controller + service + the S3
 * command construction without any network or database.
 */
export function buildUploadTestApp(): Express {
  const app = express()
  app.use(express.json())

  const fileUpload = new AwsFileUploadService({
    userUploadsBucket: "test-bucket",
    userUploadsBucketRegion: "us-east-1",
  })
  const config = { presignedUrlTtlSeconds: 900, uploadPartSizeBytes: 5 * 1024 * 1024 }
  const videoUploadService = new VideoUploadsService(config, fileUpload)
  const audioUploadService = new AudioUploadsService(config, fileUpload)

  app.use((req: Request, _res: Response, next: NextFunction) => {
    // `as any`: src/types.d.ts's ApplicationContext type is imported from a broken
    // path (a pre-existing bug we intentionally do not touch). The shape below is
    // what the controllers actually read at runtime.
    ;(req as any).context = { services: { videoUploadService, audioUploadService } }
    next()
  })

  app.use(createVideoUploadRouter())
  app.use(createAudioUploadRouter())
  return app
}
