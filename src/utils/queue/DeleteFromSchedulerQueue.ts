import Bull from "bull"
import { removeActivityJobs } from "./ActivitySchedulerJob"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()

/** Queue Process
 *
 * @param job
 * @param done
 */
export async function DeleteFromSchedulerQueueProcess(job: Bull.Job<any>, done: Bull.DoneCallback): Promise<void> {
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
}
