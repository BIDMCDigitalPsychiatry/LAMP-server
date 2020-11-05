import Bull from "bull"
import { removeActivityJobs } from "../../utils/ActivitySchedulerJob"
import { Mutex } from "async-mutex"
//Initialise UpdateToSchedulerQueue Queue
export const DeleteFromSchedulerQueue = new Bull("DeleteFromScheduler", process.env.REDIS_HOST ?? "")
const clientLock = new Mutex()
//Consume jobs from DeleteFromSchedulerQueue
DeleteFromSchedulerQueue.process(async (job: any, done: any) => {
  const release = await clientLock.acquire()
  console.log(`locked job on ${job.data.activity_id}`)
  try {
    await removeActivityJobs(job.data.activity_id)
    //release the lock for thread
    release()
    console.log(`release lock  on success  ${job.data.activity_id}`)
  } catch (error) {
    //release the lock for thread
    release()
    console.log(`release lock  on exception  ${job.data.activity_id}`)
  }
  done()
  console.log(`Job completed -  ${job.data.activity_id}`)
})
