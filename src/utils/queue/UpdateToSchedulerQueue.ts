import Bull from "bull"
import { Mutex } from "async-mutex"
import { ActivityScheduler } from "../../utils/ActivitySchedulerJob"
const clientLock = new Mutex()

//Initialise UpdateToSchedulerQueue Queue
export const UpdateToSchedulerQueue = new Bull("UpdateToScheduler", process.env.REDIS_HOST ?? "")

UpdateToSchedulerQueue.process(async (job: any, done: any) => {
  //locking the thread
  const release = await clientLock.acquire()
    console.log(`locked job on ${job.data.activity_id}`)
  try {
    await ActivityScheduler(job.data.activity_id)
    console.log(`processed ${job.data.activity_id}`)
    //release the lock for thread
    release()
    console.log(`release lock  on success  ${job.data.activity_id}`)
  } catch (error) {
    //release the lock for thread
    release()
    console.log(`released job on exception- ${job.data.activity_id}`)
  }
  done()
  console.log(`completed job on ${job.data.activity_id}`)
})
