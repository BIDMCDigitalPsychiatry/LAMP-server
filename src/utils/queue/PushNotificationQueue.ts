import Bull from "bull"
import fetch from "node-fetch"
/** Queue Process
 *
 * @param job
 */
export async function PushNotificationQueueProcess(job: Bull.Job<any>): Promise<void> {
  job.data.payload.url = `/participant/${job.data.payload.participant_id}`
  sendNotification(job.data.device_token, job.data.device_type, job.data.payload)
}

/** send notifications
 *
 * @param device_token
 * @param device_type
 * @param payload
 */
export function sendNotification(device_token: string, device_type: string, payload: any): void {
  console.dir({ device_token, device_type, payload })
  // Send this specific page URL to the device to show the actual activity.
  // eslint-disable-next-line prettier/prettier
  const url = payload.url
  const notificationId = !!payload.notificationId ? payload.notificationId : Math.floor(Math.random() * 1000000) + 1
  const gatewayURL: any = !!process.env.APP_GATEWAY
    ? `https://${process.env.APP_GATEWAY}/push`
    : `${process.env.PUSH_GATEWAY}`
  const gatewayApiKey: any = !!process.env.PUSH_API_KEY
    ? `${process.env.PUSH_API_KEY}`
    : `${process.env.PUSH_GATEWAY_APIKEY}`
  console.log(url)
  try {
    if ("undefined" === gatewayURL) {
      throw new Error("Push gateway address is not defined")
    }
    if ("undefined" === gatewayApiKey) {
      throw new Error("Push gateway apikey is not defined")
    }
    switch (device_type) {
      case "android.watch":
      case "android":
        try {
          const opts: any = {
            push_type: "gcm",
            api_key: gatewayApiKey,
            device_token: device_token,
            payload: {
              priority: "high",
              data: {
                title: `${payload.title}`,
                message: `${payload.message}`,
                page: `${url}`,
                notificationId: notificationId,
                actions: [{ name: "Open App", page: `${process.env.DASHBOARD_URL}` }],
                expiry: 21600000,
              },
            },
          }
          //connect to api gateway and send notifications
          fetch(gatewayURL, {
            method: "post",
            body: JSON.stringify(opts),
            headers: { "Content-Type": "application/json" },
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP error! status`)
              }
            })
            .catch((e) => {
              console.log("Error encountered sending GCM push notification.")
            })
        } catch (error) {
          console.log(`"Error encountered sending GCM push notification"-${error}`)
        }
        break

      case "ios":
        try {
          //preparing curl request
          const opts: any = {
            push_type: "apns",
            api_key: gatewayApiKey,
            device_token: device_token,
            payload: {
              aps: {
                alert: `${payload.message}`,
                badge: 0,
                sound: "default",
                "mutable-content": 1,
                "content-available": 1,
                "push-type": "alert",
                "collapse-id": `${notificationId}`,
                expiration: 10,
              },
              notificationId: `${notificationId}`,
              expiry: 21600000,
              page: `${url}`,
              actions: [{ name: "Open App", page: `${url}` }],
            },
          }

          //connect to api gateway and send notifications
          fetch(gatewayURL, {
            method: "post",
            body: JSON.stringify(opts),
            headers: { "Content-Type": "application/json" },
          })
            .then((res) => {
              console.log("response", res)
              if (!res.ok) {
                throw new Error(`HTTP error!`)
              }
            })
            .catch((e) => {
              console.log(`Error encountered sending APN push notification-${e}`)
            })
        } catch (error) {
          console.log(`Error encountered sending APN push notification-${error}`)
        }
        break

      case "ios.watch":
        try {
          //preparing curl request
          const opts: any = {
            push_type: "apns",
            api_key: gatewayApiKey,
            device_token: device_token,
            payload: {
              aps: {
                alert: `${payload.message}`,
                badge: 0,
                sound: "default",
                "mutable-content": 1,
                "content-available": 1,
                "push-type": "background",
                "collapse-id": `${notificationId}`,
                expiration: 10,
              },
              notificationId: `${notificationId}`,
              expiry: 21600000,
              page: `${url}`,
              actions: [{ name: "Open App", page: `${url}` }],
            },
          }
          //connect to api gateway and send notifications
          fetch(gatewayURL, {
            method: "post",
            body: JSON.stringify(opts),
            headers: { "Content-Type": "application/json" },
          })
            .then((res) => {
              console.log("response", res)
              if (!res.ok) {
                throw new Error(`HTTP error!`)
              }
            })
            .catch((e) => {
              console.log(`"Error encountered sending APN push notification."--${e}`)
            })
        } catch (error) {
          console.log(`"Error encountered sending APN push notification"-${error}`)
        }
        break
      default:
        break
    }
  } catch (error) {
    console.log(error.message)
  }
}
