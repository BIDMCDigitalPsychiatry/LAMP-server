import { prepareNotifications } from "../PushNotifications/ActivitySchedulerNotification"

import { ActivityRepository } from "../../repository/ActivityRepository"

/*Read activities
 *
 */
export const ActivityScheduler = async (participant_id?: string) => {
  let activity_feed:any={};
  if(participant_id)
  activity_feed =  await ActivityRepository._select(participant_id) 
  else
  activity_feed =  await ActivityRepository._select() 
  
  // return activity_feed
  if (activity_feed.length > 0) {
    activity_feed.map((feed: any) => {
      feed.schedule.map((schedule: any) => {
        if (schedule.time) {
          
          prepareNotifications(feed.name, {
            start_date: schedule.start_date,
            time: schedule.time,
            repeat_interval: schedule.repeat_interval,
            custom_time: schedule.custom_time,
            id: feed.id
          })
        }
      })
    })
  }
  
}


