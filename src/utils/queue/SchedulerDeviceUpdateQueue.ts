import Bull from "bull"
import { ActivityRepository, TypeRepository } from "../../repository"
import { updateDeviceDetails } from "../../utils/ActivitySchedulerJob"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()
//Initialise UpdateToSchedulerQueue Queue
export const SchedulerDeviceUpdateQueue = new Bull("SchedulerDeviceUpdate", process.env.REDIS_HOST ?? "")

//Consume jobs from SchedulerDeviceUpdateQueue
SchedulerDeviceUpdateQueue.process(async (job: any, done: any) => {
  const release = await clientLock.acquire()
  console.log(`locked job on ${job.data.participant_id}`)
  const activityIDs: any = []
  try {
    const study_id = await TypeRepository._owner(job.data.participant_id)
    const activities: any = await ActivityRepository._select(study_id, true)

    // Process activities to find activity_id
    if (activities.length != 0) {
      for (const activity of activities) {
        // If the activity has no schedules, ignore it.
        if (activity.schedule===undefined || activity.schedule.length === 0) continue
        await activityIDs.push(activity.id)
      }     
      await updateDeviceDetails(activityIDs, job.data)
      
    }
    //release the lock for thread
    release()
    console.log(`release lock  on success  ${job.data.participant_id}`)
  } catch (error) {
    //release the lock for thread
    release()
    console.log(`release lock  on exception  ${job.data.participant_id}`)
  }
  done()
  console.log(`Job completed -  ${job.data.participant_id}`)
})
