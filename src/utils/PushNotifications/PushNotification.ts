const http2 = require("http2")
const jwt = require("jsonwebtoken")

const P8 = {
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

const GCM_AUTH = `AAAAxB2qYw4:APA91bHJC87y9yx3tlZb2XQP-hYUMmb3pmXgOA1BLzqrtPzJJUHwmEEJfg5SyIKdXd0MGBxyc6jSd5-v1IPEFRkNyz5a3okT-ahEx3FPYWRnnH3kMkPOp4dfg1idpdrnnIMG_OnMk7Q1`

// Send an APNS push using `certificate` to `device` containing `payload`.
async function APNSpush(certificate: any, device: string, payload: any) {
  console.log("iospaylod",payload)
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
  const buffer = Buffer.from(JSON.stringify(JSON.parse(`${payload}`)))
  const request = client.request({
    [":method"]: "POST",
    [":path"]: `/3/device/${device}`,
    "Content-Type": "application/json",
    "Content-Length": buffer.length,
    Authorization: `Bearer ${TOKEN}`,
    "apns-topic": certificate.bundleID,
  })
  return new Promise((resolve, reject) => {
    let data: any = []
    request.setEncoding("utf8")
    request.on("response", (headers: any) => {
      if (headers[":status"] !== 200) reject()
    })
    request.on("data", (chunk: any) => {
        data.push(chunk)
    })
    // request.on("end", () => resolve(data.join()))
    request.on("end", () => {
      let response = JSON.parse(data.join())
      console.log("dataCHunk",data)
      if (response.success == 0) {reject(response)}
      else {resolve(response)}
    })
    request.write(buffer)
    request.end()
  })
}

async function GCMpush(certificate: any, device: string, payload: any) {
  const client = http2.connect("https://fcm.googleapis.com:443")
  console.log("paylod",payload)
  const buffer = Buffer.from(
    JSON.stringify({
       ...JSON.parse(`${payload}`),
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
    let data: any = []
    request.setEncoding("utf8")
    request.on("response", (headers: any) => {
      
      if (headers[":status"] !== 200) reject()
    })
    request.on("data", (chunk:any) => {
      data.push(chunk)
    })
   
    request.on("end", () => {
      let response = JSON.parse(data.join())
      console.log("dataCHunk",data)
      if (response.success == 0) {reject(response)}
      else {resolve(response)}
    })
    request.write(buffer)
    request.end()
  })
}

/*send to device with payload and device token given 
*
*/
export async function deviceNotification(device_id: string, device_type: string, payload: any) {

  let payload_data:any={};
  try {
    switch (device_type) {
      
      case "Android.Watch":
        
        payload_data=`"{priority:high,data:{title:${payload.title},message:${payload.message},page:https://www.google.com,notificationId:${payload.title},actions:[{name:Open App,page:https://www.android.com}],expiry:360000}}"`
       await GCMpush(GCM_AUTH, device_id, payload_data)
        break
      case "Android":
        payload_data=`"{priority:high,data:{title:${payload.title},message:${payload.message},page:https://www.google.com,notificationId:${payload.title},actions:[{name:Open App,page:https://www.android.com}],expiry:360000}}"`
        GCMpush(GCM_AUTH, device_id, payload_data)
        break
      case "IOS.Watch":
        payload_data=`"{aps:{alert:${payload.message},badge:0,sound:default,mutable-content:1,content-available:1},notificationId:${payload.title},expiry:60000,page:https://www.google.com,actions:[{name:Open App,page:https://www.apple.com}]}"`
        APNSpush(P8, device_id, payload_data)
        break
      case "IOS":
        payload_data=`"{aps:{alert:${payload.message},badge:0,sound:default,mutable-content:1,content-available:1},notificationId:${payload.title},expiry:60000,page:https://www.google.com,actions:[{name:Open App,page:https://www.apple.com}]}"`
        APNSpush(P8, device_id, payload_data)
        break
      default:
        break
    }
  } catch (error) {
    console.log(error)
  }
}
