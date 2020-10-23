import Bull from "bull"
import { removeActivityJobs } from "../../utils/ActivitySchedulerJob"

//Initialise UpdateToSchedulerQueue Queue
export const DeleteFromSchedulerQueue = new Bull("DeleteFromScheduler", process.env.REDIS_HOST ?? "")

//Consume jobs from DeleteFromSchedulerQueue
DeleteFromSchedulerQueue.process(async (job: any) => {
  removeActivityJobs(job.data.activity_id)
})
