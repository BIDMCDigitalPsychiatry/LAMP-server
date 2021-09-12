import Bull from "bull"
import { PushNotificationQueueProcess } from "./PushNotificationQueue"
import { PubSubAPIListenerQueueProcess } from "./PubSubAPIListenerQueue"

export let PushNotificationQueue: Bull.Queue<any> | undefined
export let PubSubAPIListenerQueue: Bull.Queue<any> | undefined
export let CacheDataQueue: Bull.Queue<any> | undefined
export let BulkDataWriteQueue: Bull.Queue<any> | undefined

/**Initialize queues and its process
 *
 */
export async function initializeQueues(): Promise<void> {
  try {
    PushNotificationQueue = new Bull("PushNotification", process.env.REDIS_HOST ?? "")
    PubSubAPIListenerQueue = new Bull("PubSubAPIListener", process.env.REDIS_HOST ?? "")    
    PushNotificationQueue.process((job) => {
      PushNotificationQueueProcess(job)
    })
    PubSubAPIListenerQueue.process((job, done) => {
      PubSubAPIListenerQueueProcess(job, done)
    })    
  } catch (error) {
    console.log(error)
  }
}
