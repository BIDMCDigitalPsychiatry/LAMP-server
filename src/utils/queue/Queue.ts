import { Bull } from "bull"
import { PushNotificationQueueProcess } from "./PushNotificationQueue"
import { PubSubAPIListenerQueueProcess } from "./PubSubAPIListenerQueue"
import { BulkDataWriteQueueProcess } from "./BulkDataWriteQueue"
import { BulkDataWriteSlaveQueueProcess } from "./BulkDataWriteSlaveQueue"

export let PushNotificationQueue: any | undefined
export let PubSubAPIListenerQueue: any | undefined
export let CacheDataQueue: any | undefined
export let BulkDataWriteQueue: any | undefined
export let BulkDataWriteSlaveQueue: any | undefined

/**Initialize queues and its process
 *
 */
export async function initializeQueues(): Promise<void> {
  try {
    PushNotificationQueue = new Bull("PushNotification", process.env.REDIS_HOST ?? "",{
      redis: { enableReadyCheck: true, maxRetriesPerRequest: null },
    })
    PubSubAPIListenerQueue = new Bull("PubSubAPIListener", process.env.REDIS_HOST ?? "",{
      redis: { enableReadyCheck: true, maxRetriesPerRequest: null },
    })
    BulkDataWriteQueue = new Bull("BulkDataWrite", process.env.REDIS_HOST ?? "",{
      redis: { enableReadyCheck: true, maxRetriesPerRequest: null },
    })
    BulkDataWriteSlaveQueue = new Bull("BulkDataWriteSlave", process.env.REDIS_HOST ?? "",{
      redis: { enableReadyCheck: true, maxRetriesPerRequest: null },
    })
    PushNotificationQueue.process((job) => {
      PushNotificationQueueProcess(job)
    })
    PubSubAPIListenerQueue.process((job, done) => {
      PubSubAPIListenerQueueProcess(job, done)
    })
    BulkDataWriteQueue.process((job) => {
      BulkDataWriteQueueProcess(job)
    })
    BulkDataWriteSlaveQueue.process((job) => {
      BulkDataWriteSlaveQueueProcess(job)
    })
  } catch (error) {
    console.log(error)
  }
}
