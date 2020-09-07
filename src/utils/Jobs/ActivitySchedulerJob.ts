import { prepareNotifications } from "../PushNotifications/ActivitySchedulerNotification"

import { ActivityRepository } from "../../repository/ActivityRepository"

/*Read activities
 *
 */
export const ActivityScheduler = async (participant_id?: string) => {
  const activity_feed: any = await ActivityRepository._select(participant_id)

  if (activity_feed.length > 0) {
    activity_feed.map((feed: any) => {
      feed.schedule.map((schedule: any) => {
        if (schedule.time) {
          //acivity_feed will be processed and individuals with schedule will be
          prepareNotifications(feed.name, {
            start_date: schedule.start_date,
            time: schedule.time, //schedule.time,
            repeat_interval: schedule.repeat_interval,
            custom_time: schedule.custom_time,
          })
        }
      })
    })
  }
}
