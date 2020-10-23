import Bull from "bull"
import { ActivityScheduler } from "../../utils/ActivitySchedulerJob"

//Initialise UpdateToSchedulerQueue Queue
export const UpdateToSchedulerQueue = new Bull("UpdateToScheduler", process.env.REDIS_HOST ?? "")

//Consume jobs from UpdateToSchedulerQueue
UpdateToSchedulerQueue.process(async (job: any) => {
  ActivityScheduler(job.data.activity_id)
})
