import http2 from "http2"
import jwt from "jsonwebtoken"

// Send an APNS push using `certificate` to `device` containing `payload`.
export async function APNSpush(device: string, payload: any): Promise<any> {
  const certificate = {
    teamID: "S2Y2D4239K",
    bundleID: "digital.lamp.mindlamp",
    keyID: "9N29933TK2",
    contents: `${process.env.APNS_CERT}`,
  }
  const TOKEN = jwt.sign(
    {
      iss: certificate.teamID,
      iat: Math.floor(Date.now() / 1000) - 1,
    },
    certificate.contents,
    {
      algorithm: "ES256",
      header: { alg: "ES256", kid: certificate.keyID },
    }
  )

  // Development: https://api.sandbox.push.apple.com:443
  // Production: https://api.push.apple.com:443
  const client = http2.connect("https://api.push.apple.com:443/")
  const buffer = Buffer.from(JSON.stringify(payload))
  const request = client.request({
    [":method"]: "POST",
    [":path"]: `/3/device/${device}`,
    "Content-Type": "application/json",
    "Content-Length": buffer.length,
    Authorization: `Bearer ${TOKEN}`,
    "apns-topic": certificate.bundleID,
  })
  return new Promise((resolve, reject) => {
    const data: any = []
    request.setEncoding("utf8")
    request.on("response", (headers: any) => {
      if (headers[":status"] !== 200) reject()
    })
    request.on("data", (chunk: any) => {
      data.push(chunk)
    })

    request.on("end", () => resolve(data.join()))
    request.write(buffer)
    request.end()
  })
}

export async function GCMpush(device: string, payload: any): Promise<any> {
  const certificate = `${process.env.GCM_CERT}`
  const client = http2.connect("https://fcm.googleapis.com:443")

  const buffer = Buffer.from(
    JSON.stringify({
      ...payload,
      to: device,
    })
  )
  const request = client.request({
    [":method"]: "POST",
    [":path"]: `/fcm/send`,
    "Content-Type": "application/json",
    "Content-Length": buffer.length,
    Authorization: `Bearer ${certificate}`,
  })
  return new Promise((resolve, reject) => {
    const data: any = []
    request.setEncoding("utf8")
    request.on("response", (headers: any) => {
      if (headers[":status"] !== 200) reject()
    })
    request.on("data", (chunk: any) => {
      data.push(chunk)
    })

    request.on("end", () => {
      const response = JSON.parse(data.join())
      if (response.success == 0) {
        reject(response)
      } else {
        resolve(response)
      }
    })
    request.write(buffer)
    request.end()
  })
}
