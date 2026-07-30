import { Router } from "express";
// import { authenticateSession } from "../middlewares/authenticateSession";
import { VideoUploadController, VideoUploadControllerImpl } from "../controllers/VideoUploadController";
import { checkAuth } from "../middlewares/tempFileUploadAuth";
import { validate } from "../middlewares/validate";
import {
  abortBodySchema,
  completeBodySchema,
  initiateBodySchema,
  participantParamsSchema,
  refreshUrlsBodySchema,
} from "../schemas/fileUpload";

//-----------------------------------------------------------------------------
// Express Router (Factory Function)
//-----------------------------------------------------------------------------

export function createVideoUploadRouter(controller : VideoUploadController = new VideoUploadControllerImpl()) : Router {

  const router = Router()

  router.post(
    "/participant/:participantId/video/upload/abort",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: abortBodySchema }),
    controller.abort
  )

  router.post(
    "/participant/:participantId/video/upload/complete",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: completeBodySchema }),
    controller.complete
  )

  router.post(
    "/participant/:participantId/video/upload/initiate",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: initiateBodySchema }),
    controller.initiate
  )

  router.post(
    "/participant/:participantId/video/upload/refresh-urls",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: refreshUrlsBodySchema }),
    controller.refreshUrls
  )

  return router;

}
