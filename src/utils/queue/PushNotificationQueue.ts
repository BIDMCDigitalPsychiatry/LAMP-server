import Bull from "bull"
import { sendNotification } from "./SchedulerQueue"

/** Queue Process
 *
 * @param job
 */
export async function PushNotificationQueueProcess(job: Bull.Job<any>): Promise<void> {
  job.data.payload.url = `/participant/${job.data.payload.participant_id}`
  sendNotification(job.data.device_token, job.data.device_type, job.data.payload)
}
