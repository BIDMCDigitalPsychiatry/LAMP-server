import Bull from "bull"
import { Repository } from "../../repository/Bootstrap"

/** Queue Process
 *
 * @param job
 */
export async function BulkDataWriteSlaveQueueProcess(job: Bull.Job<any>): Promise<void> {
  switch (job.data.key) {
    case "sensor_event":
      console.log("write started timestamp", `${job.id}-${Date.now()}`)
      const repo = new Repository()
      const SensorEventRepository = repo.getSensorEventRepository()
      const datas = job.data.payload
      let sensor_events: any[] = []
      for (const data of datas) {
        const participant_id = JSON.parse(data).participant_id
        const sensor_event = JSON.parse(data)
        await delete sensor_event.participant_id
        if (process.env.DB?.startsWith("mongodb://")) {
          await sensor_events.push({ ...sensor_event, _parent: participant_id })
        } else {
          await sensor_events.push({ ...sensor_event, "#parent": participant_id })
        }
      }
      try {
        await SensorEventRepository._bulkWrite(sensor_events)
        console.log("write finished timestamp", `${job.id}-${Date.now()}`)
      } catch (error) {
        console.log("db write error", error)
      }

      break
    default:
      break
  }
}
