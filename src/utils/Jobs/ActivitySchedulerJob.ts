import { notify } from "../PushNotifications/ActivitySchedulerNotification"

import { ActivityRepository } from "../../repository/ActivityRepository"

/*Read activities
 *
 */
export const ActivityScheduler = async (participant_id?: string) => {
  const activity_feed = await ActivityRepository._select(participant_id)
  console.log(activity_feed)

  //acivity_feed will be processed and individuals with schedule will be
  //passed to ../PushNotifications/ActivitySchedulerNotification. This will be done inside a loop
}

// }
