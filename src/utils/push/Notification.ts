import { ActivityRepository } from "../../repository/ActivityRepository"
import { TypeRepository } from "../../repository/TypeRepository"
import { ParticipantRepository } from "../../repository/ParticipantRepository"
import { SensorEventRepository } from "../../repository/SensorEventRepository"
import { deviceNotification } from "./push"

import NodeCache from "node-cache"
const triweekly = [1, 3, 5]
const biweekly = [2, 4]
const ScheduleCache = new NodeCache()

export const ActivityScheduler = async (): Promise<void> => {
  // List activities for a given ID; if a Participant ID is not provided, undefined = list ALL.
  try {
    let activities: any = []
    
    //get cached data if any
    let ScheduleCachedData = ScheduleCache.get("schedule")
    if (undefined === ScheduleCachedData) {
      //read activities
      activities = await ActivityRepository._select()  
          
       //set activitie in cached
      ScheduleCachedData = ScheduleCache.set("schedule", activities)
    } else {
      activities = ScheduleCachedData
    }
    
    //process activiites  to find schedules and corresponding participants
    await activities.map((feed: any) => {
      if (feed.schedule.length !== 0) {
        TypeRepository._parent(feed.id).then((owners: any) => {
          if (owners.Study !== undefined && typeof owners.Study == "string") {
            ParticipantRepository._select(owners.Study)
              .then((participants: any) => {
                
                participants.map((participant: any) => {
                  feed.schedule.map((schedule: any) => {
                    if (schedule.time && undefined !== participant.id) {
                      prepareNotifications(feed.name, {
                        start_date: schedule.start_date,
                        time: schedule.time,
                        repeat_interval: schedule.repeat_interval,
                        custom_time: schedule.custom_time,
                        id: feed.id,
                        participant_id: participant.id
                      })
                    }
                  })
                 
                })
              })
              .catch((error) => console.log(error.message))
          }
        })
      }
    })
  } catch (error) {
    console.log("Error in Fetching")
  }
}
/*
 * prepare notifications
 */
export async function prepareNotifications(subject: string, feed: any): Promise<void> {
  let current_feed: {} = {}

  //current date time
  const currentDateTime:Date = new Date()
  //current date
  const currentDate:number = currentDateTime.getDate()
  //feed date time
  const feedDateTime:Date = new Date(feed.time)  

  //find day number  (eg:Mon,Tue,Wed...)
  const dayNumber:number = getDayNumber(currentDateTime)
  const sheduleDayNumber:number = getDayNumber(feed.start_date)

  //get hour,minute,second formatted time from current date time
  let curHoursUtc: any = currentDateTime.getUTCHours()
  let curMinutesUtc: any = currentDateTime.getUTCMinutes()

  //appending 0 to h,m,s if <=9
  if (curHoursUtc <= 9) curHoursUtc = "0" + curHoursUtc
  if (curMinutesUtc <= 9) curMinutesUtc = "0" + curMinutesUtc

  //get h:m:s format for current date time
  const currentUtcTime:any = `${curHoursUtc}:${curMinutesUtc}`

  //get hour,minute,second formatted time from feed date time
  let feedHoursUtc: any = feedDateTime.getUTCHours()
  let feedMinutesUtc: any = feedDateTime.getUTCMinutes()

  //appending 0 to h,m,s if <=9
  if (feedHoursUtc <= 9) feedHoursUtc = "0" + feedHoursUtc
  if (feedMinutesUtc <= 9) feedMinutesUtc = "0" + feedMinutesUtc

  //get h:m:s format for feed date time
  const feedHmiUtcTime:any = `${feedHoursUtc}:${feedMinutesUtc}`

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
              participant_id: feed.participant_id,
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
              participant_id: feed.participant_id,
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
              participant_id: feed.participant_id,
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
            participant_id: feed.participant_id,
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

          //appending 0 to h,m,s if <=9
          if (customHoursUtc <= 9) customHoursUtc = "0" + customHoursUtc
          if (customMinutesUtc <= 9) customMinutesUtc = "0" + customMinutesUtc

          //get h:m:s format for custom date time
          const customHmiUtcTime = `${customHoursUtc}:${customMinutesUtc}`
          if (currentUtcTime === customHmiUtcTime) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: `Activity/Survey-${subject} scheduled for you`,
              activity_id: feed.id,
              participant_id: feed.participant_id,
            }
            sendNotifications(current_feed)
          }
        })
        break
      case "hourly":
        if (feedMinutesUtc === curMinutesUtc) {
          //prepare notifications array
          current_feed = {
            title: subject,
            message: await prepareNotifyMessage(subject),
            activity_id: feed.id,
            participant_id: feed.participant_id,
          }
           sendNotifications(current_feed)
        }
        break
      case "every3h":            
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 3 === 0) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
              participant_id: feed.participant_id,
            }
             sendNotifications(current_feed)
          }
        }
        break
      case "every6h":
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 6 === 0) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
              participant_id: feed.participant_id,
            }
             sendNotifications(current_feed)
          }
        }
        break
      case "every12h":
        if (feedMinutesUtc === curMinutesUtc) {
          if ((curHoursUtc - feedHoursUtc) % 12 === 0) {
            //prepare notifications array
            current_feed = {
              title: subject,
              message: await prepareNotifyMessage(subject),
              activity_id: feed.id,
              participant_id: feed.participant_id,
            }
             sendNotifications(current_feed)
          }
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
              participant_id: feed.participant_id,
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
            participant_id: feed.participant_id,
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
            participant_id: feed.participant_id,
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
    const DeviceDetails = await SensorEventRepository._select(notifications.participant_id, "lamp.analytics")
    if (DeviceDetails[0] && undefined !== DeviceDetails[0].data) {
      deviceNotification(
        DeviceDetails[0].data.device_token,
        DeviceDetails[0].data.device_type.toLowerCase(),
        notifications
      )
    }
  } catch (error) {
    console.log("error fetching device", error.message)
  }
}

/*prepare message for user notifications
 *
 */
async function prepareNotifyMessage(title: string): Promise<string> {
  return `Activity/Survey-${title} scheduled for you`
}
