import { Database } from "../../app"
import { deviceNotification } from "./PushNotification"
const triweekly = [1, 4, 5]
const biweekly = [2, 4]
const daily = [0, 1, 2, 3, 4, 5, 6]

/*send notifications to each participant
 *
 */
export async function prepareNotifications(subject: string, feed: any) {
  let current_feed: {} = {}
  //current date time
  let currentDateTime = new Date()
  //current time
  let currentTime = currentDateTime.getTime()
  //current date
  let currentDate = currentDateTime.getDate()
  //feed date time
  let feedDateTime = new Date(feed.time)
  //feed time
  let feedTime = feedDateTime.getTime()
  //feed date
  let feedDate = feedDateTime.getDate()
  // console.log("feedDate", feedDate)
  // console.log("currentDate", currentDate)
  //find day number  (eg:Mon,Tue,Wed...)
  let dayNumber = getDayNumber(currentDateTime)

  //get hour,minute,second formatted time from current date time
  let curHoursUtc: any = currentDateTime.getUTCHours()
  let curMinutesUtc: any = currentDateTime.getUTCMinutes()
  let curSecondsUtc: any = currentDateTime.getUTCSeconds()

  //appending 0 to h,m,s if <=9
  if (curHoursUtc <= 9) curHoursUtc = "0" + curHoursUtc
  if (curMinutesUtc <= 9) curMinutesUtc = "0" + curMinutesUtc
  if (curSecondsUtc <= 9) curSecondsUtc = "0" + curSecondsUtc

  //get h:m:s format for current date time
  let currentUtcTime = `${curHoursUtc}:${curMinutesUtc}:${curSecondsUtc}`

  //get hour,minute,second formatted time from feed date time
  let feedHoursUtc: any = feedDateTime.getUTCHours()
  let feedMinutesUtc: any = feedDateTime.getUTCMinutes()
  let feedSecondsUtc: any = feedDateTime.getUTCSeconds()

  //appending 0 to h,m,s if <=9
  if (feedHoursUtc <= 9) feedHoursUtc = "0" + feedHoursUtc
  if (feedMinutesUtc <= 9) feedMinutesUtc = "0" + feedMinutesUtc
  if (feedSecondsUtc <= 9) feedSecondsUtc = "0" + feedSecondsUtc

  //get h:m:s format for feed date time
  let feedHmiUtcTime = `${feedHoursUtc}:${feedMinutesUtc}:${feedSecondsUtc}`

  //check whether current date time is greater than the start date of activity
  if (currentDateTime >= new Date(feed.start_date)) {
    switch (feed.repeat_interval) {
      case "triweekly":
        if (triweekly.indexOf(dayNumber) > -1) {
          // if (currentUtcTime == feedHmiUtcTime) {
          //prepare notifications array
          current_feed = { title: subject, message: await prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
          // }
        }
        break
      case "biweekly":
        if (biweekly.indexOf(dayNumber) > -1) {
          if (currentUtcTime == feedHmiUtcTime) {
            //prepare notifications array
            current_feed = { title: subject, message: prepareNotifyMessage(subject) }
            sendNotifications(current_feed)
          }
        }
        break
      case "daily":
        if (currentUtcTime === feedHmiUtcTime) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "custom":
        feed.custom_time.map((time: any) => {
          current_feed = {}
          //get hour,minute,second formatted time from custom date time
          let customHoursUtc: any = time.getUTCHours()
          let customMinutesUtc: any = time.getUTCMinutes()
          let customSecondsUtc: any = time.getUTCSeconds()

          //appending 0 to h,m,s if <=9
          if (customHoursUtc <= 9) customHoursUtc = "0" + customHoursUtc
          if (customMinutesUtc <= 9) customMinutesUtc = "0" + customMinutesUtc
          if (customSecondsUtc <= 9) customSecondsUtc = "0" + customSecondsUtc

          //get h:m:s format for custom date time
          let customHmiUtcTime = `${customHoursUtc}:${customMinutesUtc}:${customSecondsUtc}`
          if (currentUtcTime === customHmiUtcTime) {
            //prepare notifications array
            current_feed = { title: subject, message: prepareNotifyMessage(subject) }
            sendNotifications(current_feed)
          }
        })
        break
      case "hourly":
        if ((currentTime - feedTime) % (60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "every3h":
        if ((currentTime - feedTime) % (3 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "every6h":
        if ((currentTime - feedTime) % (6 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "every12h":
        if ((currentTime - feedTime) % (12 * 60 * 60 * 1000) === 0) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "monthly":
        if (currentDate === feedDate) {
          if (currentUtcTime === feedHmiUtcTime) {
            //prepare notifications array
            current_feed = { title: subject, message: prepareNotifyMessage(subject) }
            sendNotifications(current_feed)
          }
        }
        break
      case "bimonthly":
        if ([10, 20].indexOf(currentDate) > -1) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
          sendNotifications(current_feed)
        }
        break
      case "none":
        if (feedDateTime === currentDateTime) {
          //prepare notifications array
          current_feed = { title: subject, message: prepareNotifyMessage(subject) }
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
function getDayNumber(date: Date) {
  date = new Date(date)
  return date.getDay()
}

/*send notifications
 *
 */
async function sendNotifications(notifications: {}) {
  
  try {
    //find device details, device class function need to be substituted in future
    (await Database.use("sensor_event").find({ selector: { sensor: "lamp.analytics" } })).docs.map((x: any) => {
      deviceNotification(x.data.device_token, x.data.device_type, notifications)
    })
  } catch (error) {
    console.log("errorfetching device", error.message)
  }

  //push notifications
}

/*prepare message for user notifications
 *
 */
async function prepareNotifyMessage(title: string) {
  return `${title} scheduled for you`
}
