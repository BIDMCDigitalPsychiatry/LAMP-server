import Bull from "bull"
import {  getHeapStatistics } from "v8"
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
        console.log("HeapStatistics",getHeapStatistics())
        console.log("heapTotal",await process.memoryUsage().heapTotal)
        console.log("heapUsed",await process.memoryUsage().heapUsed)
        try {
          console.log("writing to sensor_event db")
          await SensorEventRepository._insert(participant_id, Array.isArray(sensor_event) ? sensor_event : [sensor_event])
          console.log("heapTotal__",await process.memoryUsage().heapTotal)
          console.log("heapUsed__",await process.memoryUsage().heapUsed)
        } catch (error) {
          console.log(error)
        }
      }
      break

    default:
      break
  }
}
