import Bull from "bull"
import { Repository } from "../../repository/Bootstrap"

/** Queue Process
 *
 * @param job
 */
export async function BulkDataWriteQueueProcess(job: Bull.Job<any>): Promise<void> {
  const repo = new Repository()
  switch (job.data.key) {
    case "sensor_event":
      const SensorEventRepository = repo.getSensorEventRepository()
      for (const data of job.data.payload) {
        const participant_id = JSON.parse(data).participant_id
        const sensor_event = JSON.parse(data)
        delete sensor_event.participant_id
        try {
          SensorEventRepository._insert(participant_id, Array.isArray(sensor_event) ? sensor_event : [sensor_event])
        } catch (error) {
          console.log(error)
        }
      }
      break

    default:
      break
  }
}
