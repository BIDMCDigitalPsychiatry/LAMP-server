import Bull from "bull"
import { PushNotificationQueueProcess } from "./PushNotificationQueue"
import { PubSubAPIListenerQueueProcess } from "./PubSubAPIListenerQueue"
import { BulkDataWriteQueueProcess } from "./BulkDataWriteQueue"
import { BulkDataWriteSlaveQueueProcess } from "./BulkDataWriteSlaveQueue"

export let PushNotificationQueue: Bull.Queue<any> | undefined
export let PubSubAPIListenerQueue: Bull.Queue<any> | undefined
export let CacheDataQueue: Bull.Queue<any> | undefined
export let BulkDataWriteQueue: Bull.Queue<any> | undefined
export let BulkDataWriteSlaveQueue: Bull.Queue<any> | undefined

/**Initialize queues and its process
 *
 */
export async function initializeQueues(): Promise<void> {
  try {
    const redisUrl = new URL(process.env.REDIS_HOST as string)
    PushNotificationQueue = new Bull("PushNotification", {
      redis: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
        db: parseInt(redisUrl.pathname.slice(1)) || 0,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
      },
    })

    PubSubAPIListenerQueue = new Bull("PubSubAPIListener", {
      redis: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
        db: parseInt(redisUrl.pathname.slice(1)) || 0,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
      },
    })

    BulkDataWriteQueue = new Bull("BulkDataWrite", {
      redis: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
        db: parseInt(redisUrl.pathname.slice(1)) || 0,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
      },
    })
    BulkDataWriteSlaveQueue = new Bull("BulkDataWriteSlave", {
      redis: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
        db: parseInt(redisUrl.pathname.slice(1)) || 0,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
      },
    })
    PushNotificationQueue.process((job) => {
      PushNotificationQueueProcess(job)
    })
    PubSubAPIListenerQueue.process((job, done) => {
      return PubSubAPIListenerQueueProcess(job, done)
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
