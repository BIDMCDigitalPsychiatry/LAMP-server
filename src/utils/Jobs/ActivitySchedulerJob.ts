import { prepareNotifications } from "../PushNotifications/ActivitySchedulerNotification"

import { ActivityRepository } from "../../repository/ActivityRepository"

/*Read activities
 *
 */
export const ActivityScheduler = async (participant_id?: string) => {
  const activity_feed: any = await ActivityRepository._select(participant_id)
  // return activity_feed
  if (activity_feed.length > 0) {
    activity_feed.map((feed: any) => {
     
    
        
        feed.schedule.map((schedule: any) => {
          if (schedule.time) {
            // console.log("feedlength",schedule)
            prepareNotifications(feed.name, {
            start_date: schedule.start_date,
            time: "2019-01-24T11:10:00.000Z",//schedule.time,
            repeat_interval: schedule.repeat_interval,
            custom_time: schedule.custom_time
          })
        }
        })
      
    })
  }
  //acivity_feed will be processed and individuals with schedule will be
  //passed to ../PushNotifications/ActivitySchedulerNotification. This will be done inside a loop
}

// }
