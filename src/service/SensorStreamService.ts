import { Request, Response, Router } from "express"
import { ApiResponseHeaders } from "../repository/Bootstrap"
import { authenticateSession, AuthFlag, configureAuth } from "../middlewares/authenticateSession"

// Binary sensor-stream frames: upload, list, and download.
export class SensorStreamService {
  public static _name = "SensorStream"
  public static Router = Router()
}

function notImplemented(req: Request, res: Response) {
  res.header(ApiResponseHeaders)
  res.status(500).json({ error: "500.not-implemented" })
}

SensorStreamService.Router.post(
  "/participant/:participant_id/sensor-stream",
  configureAuth([AuthFlag.allowMobileToken]),
  authenticateSession,
  notImplemented
)
SensorStreamService.Router.get(
  "/participant/:participant_id/sensor-stream",
  configureAuth([AuthFlag.allowMobileToken]),
  authenticateSession,
  notImplemented
)
SensorStreamService.Router.get(
  "/participant/:participant_id/sensor-stream/:file_id",
  configureAuth([AuthFlag.allowMobileToken]),
  authenticateSession,
  notImplemented
)
