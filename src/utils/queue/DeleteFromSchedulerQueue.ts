import Bull from "bull"
import { removeActivityJobs } from "../../utils/ActivitySchedulerJob"
import { queueOpts } from "../../app"

//Initialise UpdateToSchedulerQueue Queue
export const DeleteFromSchedulerQueue = new Bull("DeleteFromScheduler", queueOpts)

//Consume jobs from DeleteFromSchedulerQueue
DeleteFromSchedulerQueue.process(async (job: any) => {
  removeActivityJobs(job.data.activity_id)
})
