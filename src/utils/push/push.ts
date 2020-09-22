import http2 from "http2"
import jwt from "jsonwebtoken"

// Send an APNS push using `certificate` to `device` containing `payload`.
export async function APNSpush(device: string, payload: any): Promise<any> {
  const certificate = {
    teamID: "S2Y2D4239K",
    bundleID: "digital.lamp.mindlamp",
    keyID: "9N29933TK2",
    contents: `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgDpdXvATm9Qx5d1hj
CzU1KAE8tGfSx/xNjJUkWBxSNjCgCgYIKoZIzj0DAQehRANCAAS2cf0ZTVYKhKEZ
psQfGLc2BIC89FwASq6jyW5c/kaskeTtr3lWMGYGp9HbxLK5barEm70iqjFRGfR4
ak/zFFvq
-----END PRIVATE KEY-----`,
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
  const certificate = `AAAAxB2qYw4:APA91bHJC87y9yx3tlZb2XQP-hYUMmb3pmXgOA1BLzqrtPzJJUHwmEEJfg5SyIKdXd0MGBxyc6jSd5-v1IPEFRkNyz5a3okT-ahEx3FPYWRnnH3kMkPOp4dfg1idpdrnnIMG_OnMk7Q1`
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
