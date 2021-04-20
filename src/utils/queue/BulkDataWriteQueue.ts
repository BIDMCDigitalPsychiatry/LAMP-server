import Bull from "bull"
import { Repository } from "../../repository/Bootstrap"

//Initialise BulkDataWrite Queue
export const BulkDataWriteQueue = new Bull("BulkDataWrite", process.env.REDIS_HOST ?? "")

//Consume job from BulkDataWrite
BulkDataWriteQueue.process(async (job) => {
  const repo = new Repository()
  switch (job.data.key) {
    case "sensor_event":
      const SensorEventRepository = repo.getSensorEventRepository()
      for (const data of job.data.payload) {
        const participant_id = JSON.parse(data).participant_id
        const sensor_event = JSON.parse(data)
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
})
