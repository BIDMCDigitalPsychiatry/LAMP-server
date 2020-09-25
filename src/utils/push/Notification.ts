import { ActivityRepository } from "../../repository/ActivityRepository"
import { TypeRepository } from "../../repository/TypeRepository"
import { ParticipantRepository } from "../../repository/ParticipantRepository"
import { SensorEventRepository } from "../../repository/SensorEventRepository"
import fetch from "node-fetch"

/// List activities for a given ID; if a Participant ID is not provided, undefined = list ALL.
export const ActivityScheduler = async (): Promise<void> => {
  try {
    const activities: any[] =  await ActivityRepository._select()
    console.log(`Processing ${activities.length} activities for push notifications.`)

    // Process activities to find schedules and corresponding participants.
    for (const activity of activities) {
      // If the activity has no schedules, ignore it.
      if (activity.schedule.length === 0) continue

      // Get all the participants of the study that the activity belongs to.
      const parent: any = await TypeRepository._parent(activity.id)
      const participants = await ParticipantRepository._select(parent["Study"])

      // Iterate all schedules, and if the schedule should be fired at this instant, iterate all participants
      // and their potential device tokens for which we will send the device push notifications.
      for (const schedule of activity.schedule) {
        if (shouldSendNotification(schedule)) {
          for (const participant of participants) {
            try {
              // Collect the Participant's device token, if there is one saved.
              const events = await SensorEventRepository._select(participant.id, "lamp.analytics")
              const device = events.find((x) => x.data?.device_token !== undefined)?.data
              if (device === undefined || device.device_token.length === 0) continue

              // If we have a device token saved for this Participant, we are able to send this notification.
               await sendNotification(device.device_token, device.device_type.toLowerCase(), {
                title: activity.name,
                message: `You have a mindLAMP activity waiting for you: ${activity.name}.`,
                activity_id: activity.id,
                participant_id: participant.id,
              })
            } catch (error) {
              console.log("Error fetching Participant Device.")
              console.error(error)
            }
          }
        }
      }
    }
  } catch (error) {
    console.log("Encountered an error in delivering push notifications.")
    console.error(error)
  }
}

/// Check to see if this schedule requires us to send a notification right now.
export function shouldSendNotification(schedule: any): boolean {
  const currentDateTime: Date = new Date()
  const currentDate: number = currentDateTime.getDate()
  const feedDateTime: Date = new Date(schedule.time)
  //find day number  (eg:Mon,Tue,Wed...)
  const dayNumber: number = new Date(currentDateTime).getDay()
  const sheduleDayNumber: number = new Date(schedule.start_date).getDay()
  //get hour,minute,second formatted time from current date time
  let curHoursUtc: any = currentDateTime.getUTCHours()
  let curMinutesUtc: any = currentDateTime.getUTCMinutes()
  //appending 0 to h,m,s if <=9
  if (curHoursUtc <= 9) curHoursUtc = "0" + curHoursUtc
  if (curMinutesUtc <= 9) curMinutesUtc = "0" + curMinutesUtc
  //get h:m:s format for current date time
  const currentUtcTime: any = `${curHoursUtc}:${curMinutesUtc}`
  //get hour,minute,second formatted time from feed date time
  let feedHoursUtc: any = feedDateTime.getUTCHours()
  let feedMinutesUtc: any = feedDateTime.getUTCMinutes()
  //appending 0 to h,m,s if <=9
  if (feedHoursUtc <= 9) feedHoursUtc = "0" + feedHoursUtc
  if (feedMinutesUtc <= 9) feedMinutesUtc = "0" + feedMinutesUtc
  //get h:m:s format for feed date time
  const feedHmiUtcTime: any = `${feedHoursUtc}:${feedMinutesUtc}`

  //check whether current date time is greater than the start date of activity
  if (currentDateTime >= new Date(schedule.start_date)) {
    switch (schedule.repeat_interval) {
      case "triweekly":
        if ([1, 3, 5].indexOf(dayNumber) > -1) {
          if (currentUtcTime === feedHmiUtcTime) {
            return true
          }
        }
        break
      case "biweekly":
        if ([2, 4].indexOf(dayNumber) > -1) {
          if (currentUtcTime === feedHmiUtcTime) {
            return true
          }
        }
        break
      case "weekly":
        if (sheduleDayNumber === dayNumber) {
          if (currentUtcTime === feedHmiUtcTime) {
            return true
          }
        }
        break
      case "daily":
        if (currentUtcTime === feedHmiUtcTime) {
          return true
        }
        break
      case "custom":
        const res = schedule.custom_time.map((time: any) => {
          //get hour,minute,second formatted time from custom date time
          let customHoursUtc: any = new Date(time).getUTCHours()
          let customMinutesUtc: any = new Date(time).getUTCMinutes()

          //appending 0 to h,m,s if <=9
          if (customHoursUtc <= 9) customHoursUtc = "0" + customHoursUtc
          if (customMinutesUtc <= 9) customMinutesUtc = "0" + customMinutesUtc

          //get h:m:s format for custom date time
          const customHmiUtcTime = `${customHoursUtc}:${customMinutesUtc}`
          if (currentUtcTime === customHmiUtcTime) {
            return true
          } else {
            return false
          }
        })
        // return true for all if any of the custom times were set to true
        if (res.filter((x: any) => x === true).length > 0) return true
        break
      case "hourly":
        if (feedMinutesUtc === curMinutesUtc) {
          return true
        }
        break
      case "every3h":
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 3 === 0) {
            return true
          }
        }
        break
      case "every6h":
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 6 === 0) {
            return true
          }
        }
        break
      case "every12h":
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 12 === 0) {
            return true
          }
        }
        break
      case "monthly":
        if (sheduleDayNumber === dayNumber) {
          if (currentUtcTime === feedHmiUtcTime) {
            return true
          }
        }
        break
      case "bimonthly":
        if ([10, 20].indexOf(currentDate) > -1) {
          return true
        }
        break
      case "none":
        if (feedDateTime === currentDateTime) {
          return true
        }
        break
      default:
        break
    }
  }
  return false
}

/// Send to device with payload and device token given.
async function sendNotification(device_token: string, device_type: string, payload: any):Promise<any> {
  console.dir({ device_token, device_type, payload })
  // Send this specific page URL to the device to show the actual activity.
  // eslint-disable-next-line prettier/prettier
  const url = `${"https://dashboard-staging.lamp.digital/#/"}participant/${payload.participant_id}/activity/${
    payload.activity_id
  }`

  switch (device_type) {
    case "android.watch":
    case "android":
      try {
        const opts: any = {
          push_type: "gcm",
          api_key: `${process.env.PUSH_GATEWAY_APIKEY}`,
          device_token: device_token,
          payload: {
            priority: "high",
            data: {
              title: `${payload.title}`,
              message: `${payload.message}`,
              page: `${url}`,
              notificationId: `${payload.title}`,
              actions: [{ name: "Open App", page: "https://www.android.com" }],
              expiry: 360000,
            },
          },
        }
        //connect to api gateway and send notifications
        const response = await fetch(`${process.env.PUSH_GATEWAY}`, {
          method: "post",
          body: JSON.stringify(opts),
          headers: { "Content-Type": "application/json" },
        })
        if(!response.ok) {
          throw new Error("HTTP error")
        }
       
      } catch (error) {
        console.log(`"Error encountered sending GCM push notification"-${error}`)
      }
      break

    case "ios":
    case "ios.watch":
      try {
        //preparing curl request
        const opts: any = {
          push_type: "apns",
          api_key: `${process.env.PUSH_GATEWAY_APIKEY}`,
          device_token: device_token,
          payload: {
            aps: {
              alert: `${payload.message}`,
              badge: 0,
              sound: "default",
              "mutable-content": 1,
              "content-available": 1,
            },
            notificationId: `${payload.title}`,
            expiry: 60000,
            page: `${url}`,
            actions: [{ name: "Open App", page: `${url}` }],
          },
        }
        //connect to api gateway and send notifications
        const response = await fetch(`${process.env.PUSH_GATEWAY}`, {
          method: "post",
          body: JSON.stringify(opts),
          headers: { "Content-Type": "application/json" },
        })
        if(!response.ok) {
          throw new Error("HTTP error")
        }
        
      } catch (error) {
        console.log(`"Error encountered sending APN push notification"-${error}`)
      }
      break
    default:
      break
  }
}
