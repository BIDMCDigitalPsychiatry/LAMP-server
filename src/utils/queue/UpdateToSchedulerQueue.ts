import Bull from "bull"
import { ActivityScheduler } from "../../utils/ActivitySchedulerJob"
import { queueOpts } from "../../app"

//Initialise UpdateToSchedulerQueue Queue
export const UpdateToSchedulerQueue = new Bull("UpdateToScheduler", queueOpts)

//Consume jobs from UpdateToSchedulerQueue
UpdateToSchedulerQueue.process(async (job: any) => {
  ActivityScheduler(job.data.activity_id)
})
