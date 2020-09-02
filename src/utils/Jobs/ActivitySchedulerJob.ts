import { notify } from "../PushNotifications/ActivitySchedulerNotification"

import { ActivityRepository } from "../../repository/ActivityRepository"

/*Read activities
 *
 */
export const ActivityScheduler = async (participant_id?: string) => {
  const activity_feed: any = await ActivityRepository._select(participant_id)

  if (activity_feed.length > 0) {
    activity_feed.map((feed: any) => {
      if (feed.schedule) {
        feed.schedule.map((schedule: any) => {
          notify(feed.name, {
            start_date: schedule.start_date,
            time: schedule.time,
            repeat_interval: schedule.repeat_interval,
          })
        })
      }
    })
  }
  //acivity_feed will be processed and individuals with schedule will be
  //passed to ../PushNotifications/ActivitySchedulerNotification. This will be done inside a loop
}

// }
