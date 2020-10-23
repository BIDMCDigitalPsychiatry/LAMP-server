import Bull from "bull"
import { ActivityRepository } from "../../repository"
import { ActivityScheduler, updateDeviceDetails } from "../../utils/ActivitySchedulerJob"

//Initialise UpdateToSchedulerQueue Queue
export const SchedulerDeviceUpdateQueue = new Bull("SchedulerDeviceUpdate", process.env.REDIS_HOST ?? "")

//Consume jobs from SchedulerDeviceUpdateQueue
SchedulerDeviceUpdateQueue.process(async (job: any) => {
  const activityIDs: any = []
  const activities: any = await ActivityRepository._select(job.data.participant_id)
  // Process activities to find activity_id
  if (activities.length != 0) {
    for (const activity of activities) {
      // If the activity has no schedules, ignore it.
      if (activity.schedule.length === 0) continue
      activityIDs.push(activity.id)
    }
    updateDeviceDetails(activityIDs, job.data)
  }
})
