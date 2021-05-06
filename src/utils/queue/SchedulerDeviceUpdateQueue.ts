import Bull from "bull"
import { Repository } from "../../repository/Bootstrap"
import { updateDeviceDetails } from "./ActivitySchedulerJob"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()

/**
 *
 * @param job
 * @param done
 */
export async function SchedulerDeviceUpdateQueueProcess(job: Bull.Job<any>, done: Bull.DoneCallback): Promise<void> {
  const release = await clientLock.acquire()
  console.log(`locked job on ${job.data.participant_id}`)
  const repo = new Repository()
  const TypeRepository = repo.getTypeRepository()
  const ActivityRepository = repo.getActivityRepository()
  const activityIDs: any = []
  try {
    const study_id = await TypeRepository._owner(job.data.participant_id)
    const activities: any = await ActivityRepository._select(study_id, true)

    // Process activities to find activity_id
    if (activities.length != 0) {
      for (const activity of activities) {
        // If the activity has no schedules, ignore it.
        if (activity.schedule === undefined || activity.schedule.length === 0) continue
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
}
