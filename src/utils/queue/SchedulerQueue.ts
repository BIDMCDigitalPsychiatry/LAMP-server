import Bull from "bull"
import fetch from "node-fetch"
import { ActivityScheduler, removeDuplicateParticipants } from "./ActivitySchedulerJob"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()

/**
 *
 * @param job
 * @param done
 */
export async function SchedulerQueueProcess(job: Bull.Job<any>, done: Bull.DoneCallback): Promise<void> {
  const data: any = job.data
  try {
    //removing duplicate device token (if any)
    const uniqueParticipants = await removeDuplicateParticipants(data.participants)
    for (const device of uniqueParticipants) {
      const device_type = device.device_type
      const device_token = device.device_token
      const participant_id = device.participant_id
      if (undefined !== device_token && undefined !== device_type && undefined !== participant_id) {
        sendNotification(device_token, device_type, {
          participant_id: participant_id,
          activity_id: data.activity_id,
          message: data.message,
          title: data.title,
          url: `/participant/${participant_id}/activity/${data.activity_id}`,
          notificationId: !!data.notificationIds ? data.notificationIds : undefined,
        })
      }
    }
  } catch (error) {}
  done()
}
//listen to the competed event of Scheduler Queue
export async function SchedulerQueueOnCompleted(job: Bull.Job<any>): Promise<void> {
  console.log(`Completed  job state on ${job.data.activity_id}`)
  const release = await clientLock.acquire()
  try {
    console.log(`locked job on ${job.data.activity_id}`)
    console.log("jobs in queue")
    await ActivityScheduler(job.data.activity_id)
    release()
    console.log(`Rescheduled job after notificcation process-  ${job.data.activity_id}`)
    console.log(`release lock  on success  ${job.data.activity_id}`)
  } catch (error) {
    //release the lock for thread
    release()
    console.log(`release lock  on exception2  ${job.data.activity_id}`)
  }
}

/// Send to device with payload and device token given.
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
              console.log(`"Error encountered sending APN push notification."--${e}`)
            })
        } catch (error) {
          console.log(`"Error encountered sending APN push notification"-${error}`)
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
