import { Database } from "../../app"
import { ActivityRepository } from "../../repository/ActivityRepository"
import { deviceNotification } from "./push"

const triweekly = [1, 4, 5]
const biweekly = [2, 4]

export const ActivityScheduler = async (participant_id?: string): Promise<void> => {
  // List activities for a given ID; if a Participant ID is not provided, undefined = list ALL.
  const activities = await ActivityRepository._select(participant_id)
  activities.map((feed: any) => {
    feed.schedule.map((schedule: any) => {
      if (schedule.time) {
        prepareNotifications(feed.name, {
          start_date: schedule.start_date,
          time: schedule.time,
          repeat_interval: schedule.repeat_interval,
          custom_time: schedule.custom_time,
          id: feed.id,
        })
      }
    })
  })
}

/*
 * send notifications to each participant
 */
export async function prepareNotifications(subject: string, feed: any): Promise<void> {
  let current_feed: {} = {}

  //current date time
  const currentDateTime = new Date()
  //current time
  const currentTime = currentDateTime.getTime()
  //current date
  const currentDate = currentDateTime.getDate()
  //feed date time
  const feedDateTime = new Date(feed.time)
  //feed time
  const feedTime = feedDateTime.getTime()
  //feed date
  const feedDate = feedDateTime.getDate()

  //find day number  (eg:Mon,Tue,Wed...)
  const dayNumber = getDayNumber(currentDateTime)
  const sheduleDayNumber = getDayNumber(feed.start_date)

  //get hour,minute,second formatted time from current date time
  let curHoursUtc: any = currentDateTime.getUTCHours()
  let curMinutesUtc: any = currentDateTime.getUTCMinutes()
  let curSecondsUtc: any = currentDateTime.getUTCSeconds()

  //appending 0 to h,m,s if <=9
  if (curHoursUtc <= 9) curHoursUtc = "0" + curHoursUtc
  if (curMinutesUtc <= 9) curMinutesUtc = "0" + curMinutesUtc
  if (curSecondsUtc <= 9) curSecondsUtc = "0" + curSecondsUtc

  //get h:m:s format for current date time
  const currentUtcTime = `${curHoursUtc}:${curMinutesUtc}:${curSecondsUtc}`

  //get hour,minute,second formatted time from feed date time
  let feedHoursUtc: any = feedDateTime.getUTCHours()
  let feedMinutesUtc: any = feedDateTime.getUTCMinutes()
  let feedSecondsUtc: any = feedDateTime.getUTCSeconds()

  //appending 0 to h,m,s if <=9
  if (feedHoursUtc <= 9) feedHoursUtc = "0" + feedHoursUtc
  if (feedMinutesUtc <= 9) feedMinutesUtc = "0" + feedMinutesUtc
  if (feedSecondsUtc <= 9) feedSecondsUtc = "0" + feedSecondsUtc

  //get h:m:s format for feed date time
  const feedHmiUtcTime = `${feedHoursUtc}:${feedMinutesUtc}:${feedSecondsUtc}`

  //check whether current date time is greater than the start date of activity
  if (currentDateTime >= new Date(feed.start_date)) {
    switch (feed.repeat_interval) {
      case "triweekly":
        if (triweekly.indexOf(dayNumber) > -1) {
          if (currentUtcTime === feedHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
            }
            sendNotifications(current_feed)
          }
        }
        break
      case "biweekly":
        if (biweekly.indexOf(dayNumber) > -1) {
          if (currentUtcTime === feedHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
            }
            sendNotifications(current_feed)
          }
        }
        break
      case "weekly":
        if (sheduleDayNumber === dayNumber) {
          if (currentUtcTime === feedHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
            }
            sendNotifications(current_feed)
          }
        }
        break
      case "daily":
        if (currentUtcTime === feedHmiUtcTime) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "custom":
        feed.custom_time.map((time: any) => {
          current_feed = {}
          //get hour,minute,second formatted time from custom date time
          let customHoursUtc: any = new Date(time).getUTCHours()
          let customMinutesUtc: any = new Date(time).getUTCMinutes()
          let customSecondsUtc: any = new Date(time).getUTCSeconds()

          //appending 0 to h,m,s if <=9
          if (customHoursUtc <= 9) customHoursUtc = "0" + customHoursUtc
          if (customMinutesUtc <= 9) customMinutesUtc = "0" + customMinutesUtc
          if (customSecondsUtc <= 9) customSecondsUtc = "0" + customSecondsUtc

          //get h:m:s format for custom date time
          const customHmiUtcTime = `${customHoursUtc}:${customMinutesUtc}:${customSecondsUtc}`
          if (currentUtcTime === customHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: `Activity/Survey-${subject} scheduled for you`,
              activity_id: feed.id,
            }
            sendNotifications(current_feed)
          }
        })
        break
      case "hourly":
        if ((currentTime - feedTime) % (60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "every3h":
        if ((currentTime - feedTime) % (3 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "every6h":
        if ((currentTime - feedTime) % (6 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "every12h":
        if ((currentTime - feedTime) % (12 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "monthly":
        if (sheduleDayNumber === dayNumber) {
          if (currentUtcTime === feedHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
            }
            sendNotifications(current_feed)
          }
        }
        break
      case "bimonthly":
        if ([10, 20].indexOf(currentDate) > -1) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }
          sendNotifications(current_feed)
        }
        break
      case "none":
        if (feedDateTime === currentDateTime) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
          }

          sendNotifications(current_feed)
        }
        break

      default:
        break
    }
  }
}

/*return day number
 *
 */
function getDayNumber(date: Date): number {
  date = new Date(date)
  return date.getDay()
}

/*send notifications
 *
 */
async function sendNotifications(notifications: any = {}): Promise<any> {
  try {
    //find device details, device class function need to be substituted in future
    ;(await Database.use("sensor_event").find({ selector: { sensor: "lamp.analytics" } })).docs.map((x: any) => {
      if (undefined !== x.data.device_token) {
        notifications.participant_id = x["#parent"]
        deviceNotification(x.data.device_token, x.data.device_type.toLowerCase(), notifications)
      }
    })
  } catch (error) {
    console.log("errorfetching device", error.message)
  }

  //push notifications
}

/*prepare message for user notifications
 *
 */
async function prepareNotifyMessage(title: string): Promise<string> {
  return `Activity/Survey-${title} scheduled for you`
}
