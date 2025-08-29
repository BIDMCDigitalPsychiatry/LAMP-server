import { Router, Request, Response, NextFunction } from "express";

const {
  ORG_OPENCONTAINERS_IMAGE_VERSION,
  ORG_OPENCONTAINERS_IMAGE_REVISION,
  ORG_OPENCONTAINERS_IMAGE_CREATED,
  PUSH_GATEWAY
} = process.env

export const SystemInfoAPI = Router()

function systemInfoAuthGuard(req: Request, resp: Response, next: NextFunction) {
  if (req.query.key == process.env.SYSTEM_STATUS_API_KEY) {
    return next();
  } else {
    return resp.status(404).json({ message: "404.api-endpoint-unimplemented" })
  }
}

async function fetchGatewayVersionDetails() {
  if (! PUSH_GATEWAY) return {}

  try {
    const url = new URL(PUSH_GATEWAY)
    url.pathname = "/system/version"
    return (await fetch(url, { signal: AbortSignal.timeout(5000) })).json()
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
      const gatewayVersionInfo = await fetchGatewayVersionDetails();

      const versionInfo = {
        this: {
          version: ORG_OPENCONTAINERS_IMAGE_VERSION,
          revision: ORG_OPENCONTAINERS_IMAGE_REVISION,
          created: {
            utc: ORG_OPENCONTAINERS_IMAGE_CREATED,
          }
        },
        upstream: {
          gateway: gatewayVersionInfo
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