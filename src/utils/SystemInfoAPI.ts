import { Router, Request, Response, NextFunction } from "express";

const {
  ORG_OPENCONTAINERS_IMAGE_VERSION,
  ORG_OPENCONTAINERS_IMAGE_REVISION,
  ORG_OPENCONTAINERS_IMAGE_CREATED,
  NOTIFICATION_SERVICE_URL,
  NOTIFICATION_SERVICE_API_KEY
} = process.env

export const SystemInfoAPI = Router()

function systemInfoAuthGuard(req: Request, resp: Response, next: NextFunction) {
  if (req.query.key == process.env.SYSTEM_STATUS_API_KEY) {
    return next();
  } else {
    return resp.status(404).json({ message: "404.api-endpoint-unimplemented" })
  }
}

async function fetchNotificationServiceVersionDetails() {
  if (! NOTIFICATION_SERVICE_URL) return {}

  try {
    const url = new URL(NOTIFICATION_SERVICE_URL)
    url.pathname = "/system/version"
    
    const headers: Record<string, string> = {}
    if (NOTIFICATION_SERVICE_API_KEY) {
      headers['Authorization'] = `Bearer ${NOTIFICATION_SERVICE_API_KEY}`
    }
    
    return (await fetch(url, { 
      headers,
      signal: AbortSignal.timeout(5000) 
    })).json()
  } catch(e) {
    console.warn(`Could not fetch gateway version info`, e)
  }

  return {}
}

SystemInfoAPI.get(
  "/version",
  [
    systemInfoAuthGuard,
    async (_: Request, resp: Response) => {
      const notificationServiceVersionInfo = await fetchNotificationServiceVersionDetails();

      const versionInfo = {
        this: {
          version: ORG_OPENCONTAINERS_IMAGE_VERSION,
          revision: ORG_OPENCONTAINERS_IMAGE_REVISION,
          created: {
            utc: ORG_OPENCONTAINERS_IMAGE_CREATED,
          }
        },
        upstream: {
          notifications: {
            ...notificationServiceVersionInfo,
            url: NOTIFICATION_SERVICE_URL
          }
        }
      }

      return resp.status(200).json(versionInfo)
    }
  ]
)

SystemInfoAPI.get(
  "/metrics",
  [
    systemInfoAuthGuard,
    (req: Request, resp: Response) => {
      return resp.status(200).send("")
    }
  ]
)

SystemInfoAPI.get("/healthz", (req: Request, resp: Response) => {
  return resp.status(200).send("ok")
})

SystemInfoAPI.get("/readyz", (req: Request, resp: Response) => {
  return resp.status(200).send("ok")
})