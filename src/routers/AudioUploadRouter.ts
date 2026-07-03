import { Router } from "express";
import { AudioUploadController, AudioUploadControllerImpl } from "../controllers/AudioUploadController";
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

export function createAudioUploadRouter(controller : AudioUploadController = new AudioUploadControllerImpl()) : Router {

  const router = Router()

  router.post(
    "/participant/:participantId/audio/upload/abort",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: abortBodySchema }),
    controller.abort
  )

  router.post(
    "/participant/:participantId/audio/upload/complete",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: completeBodySchema }),
    controller.complete
  )

  router.post(
    "/participant/:participantId/audio/upload/initiate",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: initiateBodySchema }),
    controller.initiate
  )

  router.post(
    "/participant/:participantId/audio/upload/refresh-urls",
    // authenticateSession,
    checkAuth,
    validate({ params: participantParamsSchema, body: refreshUrlsBodySchema }),
    controller.refreshUrls
  )

  return router;

}
