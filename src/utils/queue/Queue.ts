import Bull from "bull"
import { SchedulerQueueProcess, SchedulerQueueOnCompleted } from "./SchedulerQueue"
import { UpdateToSchedulerQueueProcess } from "./UpdateToSchedulerQueue"
import { SchedulerDeviceUpdateQueueProcess } from "./SchedulerDeviceUpdateQueue"
import { PushNotificationQueueProcess } from "./PushNotificationQueue"
import { PubSubAPIListenerQueueProcess } from "./PubSubAPIListenerQueue"
import { DeleteFromSchedulerQueueProcess } from "./DeleteFromSchedulerQueue"
import { CacheDataQueueProcess } from "./CacheDataQueue"
import { BulkDataWriteQueueProcess } from "./BulkDataWriteQueue"

export let SchedulerQueue: Bull.Queue<any> | undefined
export let SchedulerReferenceQueue: Bull.Queue<any> | undefined
export let UpdateToSchedulerQueue: Bull.Queue<any> | undefined
export let SchedulerDeviceUpdateQueue: Bull.Queue<any> | undefined
export let PushNotificationQueue: Bull.Queue<any> | undefined
export let PubSubAPIListenerQueue: Bull.Queue<any> | undefined
export let DeleteFromSchedulerQueue: Bull.Queue<any> | undefined
export let CacheDataQueue: Bull.Queue<any> | undefined
export let BulkDataWriteQueue: Bull.Queue<any> | undefined

/**Initialize queues and its process
 *
 */
export async function initializeQueues(): Promise<void> {
  try {
    SchedulerQueue = new Bull("Scheduler", process.env.REDIS_HOST ?? "")
    SchedulerReferenceQueue = new Bull("SchedulerReference", process.env.REDIS_HOST ?? "")
    UpdateToSchedulerQueue = new Bull("UpdateToScheduler", process.env.REDIS_HOST ?? "")
    SchedulerDeviceUpdateQueue = new Bull("SchedulerDeviceUpdate", process.env.REDIS_HOST ?? "")
    PushNotificationQueue = new Bull("PushNotification", process.env.REDIS_HOST ?? "")
    PubSubAPIListenerQueue = new Bull("PubSubAPIListener", process.env.REDIS_HOST ?? "")
    DeleteFromSchedulerQueue = new Bull("DeleteFromScheduler", process.env.REDIS_HOST ?? "")
    CacheDataQueue = new Bull("CacheData", process.env.REDIS_HOST ?? "")
    BulkDataWriteQueue = new Bull("BulkDataWrite", process.env.REDIS_HOST ?? "")
    SchedulerQueue.process((job, done) => {
      SchedulerQueueProcess(job, done)
    })
    SchedulerQueue.on("completed", (job) => {
      SchedulerQueueOnCompleted(job)
    })
    UpdateToSchedulerQueue.process((job, done) => {
      UpdateToSchedulerQueueProcess(job, done)
    })
    SchedulerDeviceUpdateQueue.process((job, done) => {
      SchedulerDeviceUpdateQueueProcess(job, done)
    })
    PushNotificationQueue.process((job) => {
      PushNotificationQueueProcess(job)
    })
    PubSubAPIListenerQueue.process((job) => {
      PubSubAPIListenerQueueProcess(job)
    })
    DeleteFromSchedulerQueue.process((job, done) => {
      DeleteFromSchedulerQueueProcess(job, done)
    })
    BulkDataWriteQueue.process((job) => {
      BulkDataWriteQueueProcess(job)
    })
    CacheDataQueue.process((job) => {
      CacheDataQueueProcess(job)
    })
  } catch (error) {
    console.log(error)
  }
}
