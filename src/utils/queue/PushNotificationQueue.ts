import Bull from "bull"
import { sendNotification } from "./SchedulerQueue"

//Initialise UpdateToSchedulerQueue Queue
export const PushNotificationQueue = new Bull("PushNotification", process.env.REDIS_HOST ?? "")

PushNotificationQueue.process(async (job) => {  
  job.data.payload.url = `/participant/${job.data.payload.participant_id}`
  sendNotification(job.data.device_token, job.data.device_type, job.data.payload)
})
