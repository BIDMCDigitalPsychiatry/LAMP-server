import Bull from "bull"
import { Repository } from "../../repository/Bootstrap"
import { Mutex } from "async-mutex"
import { MongoClientDB } from "../../repository/Bootstrap"
import { Database } from "../../repository/Bootstrap"

/** Queue Process
 *
 * @param job
 */
export async function BulkDataWriteQueueProcess(job: Bull.Job<any>): Promise<void> {
  const repo = new Repository()
  switch (job.data.key) {
    case "sensor_event":
      const SensorEventRepository = repo.getSensorEventRepository()
      let sensor_events: any[] = []
      for (const data of job.data.payload) {
        const participant_id = JSON.parse(data).participant_id
        const sensor_event = JSON.parse(data)
        delete sensor_event.participant_id
        if (process.env.DB?.startsWith("mongodb://")) {
          await sensor_events.push({ ...sensor_event, _parent: participant_id })
        } else {
          await sensor_events.push({ ...sensor_event, "#parent": participant_id })
        }
      }
      try {
        console.log("sensor_events length", sensor_events.length)
        await SensorEventRepository._bulkWrite(sensor_events)
      } catch (error) {
        console.log(error)
      }

      break

    default:
      break
  }
}
