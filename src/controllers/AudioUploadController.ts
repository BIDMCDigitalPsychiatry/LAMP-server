import { Request, Response, Router } from "express";
import { authenticateSession } from "../middlewares/authenticateSession";

class AudioUploadController {

  static async initiate(req: Request, resp: Response) {
    throw new Error("Method not implemented.");
  }

  static async complete(req: Request, resp: Response) {
    throw new Error("Method not implemented.");
  }

  static async refreshUrls(req: Request, resp: Response) {
    throw new Error("Method not implemented.");
  }

  static async abort(req: Request, resp: Response) {
    throw new Error("Method not implemented.");
  }

}

const AudioUploadRouter : Router = Router()

AudioUploadRouter.post("/participant/:participantId/audio/upload/initiate",     [authenticateSession], AudioUploadController.initiate)
AudioUploadRouter.post("/participant/:participantId/audio/upload/complete",     [authenticateSession], AudioUploadController.complete)
AudioUploadRouter.post("/participant/:participantId/audio/upload/refresh-urls", [authenticateSession], AudioUploadController.refreshUrls)
AudioUploadRouter.post("/participant/:participantId/audio/upload/abort",        [authenticateSession], AudioUploadController.abort)

export { AudioUploadController, AudioUploadRouter };