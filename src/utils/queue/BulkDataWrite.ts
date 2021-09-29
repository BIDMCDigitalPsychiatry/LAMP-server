import { RedisClient } from "../../repository/Bootstrap"
import { PubSubAPIListenerQueue } from "./Queue"
import { Repository } from "../../repository/Bootstrap"
import { BulkDataWriteQueue } from "./Queue"

/**Bulk data write to database
 *
 * @param key
 * @param participant_id
 * @param data
 */
export const BulkDataWrite = async (key: string, participant_id: string, data: any[]): Promise<void> => {
  switch (key) {
    case "sensor_event":
      if (data.length === 0 || data.length === undefined) break
      publishSensorEvent(participant_id, [data[data.length - 1]])
      if (data.length === 1) {
        const SensorEventRepository = new Repository().getSensorEventRepository()
        await SensorEventRepository._insert(participant_id, data)
        break
      }
      for (const event of data) {
        try {
          event.participant_id = participant_id
          event.timestamp = Number.parse(event.timestamp)
          event.sensor = String(event.sensor)
          //Push to redis store
          await RedisClient?.rpush("se_Q", [JSON.stringify(event)])
        } catch (error) {
          console.log("error while pushing to redis store", error)
        }
      }
      //trigger event to check store size and db writes
      BulkDataWriteQueue?.add(
        {
          key: "sensor_event",
        },
        {
          attempts: 3, //attempts to do db write if failed
          backoff: 10000, // retry for db insert every 10 seconds if failed
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      break

    default:
      break
  }
}

/**add data to pubsub queue for publishing sensorevents
 *
 * @param participant_id
 * @param data
 */
function publishSensorEvent(participant_id: string, data: any[]) {
  const topics = [
    `sensor_event`,
    `participant.*.sensor_event`,
    `sensor.*.sensor_event`,
    `participant.*.sensor.*.sensor_event`,
  ]
  try {
    topics.map((x: string) => {
      //publishing data for sensor_event
      PubSubAPIListenerQueue?.add(
        {
          topic: x,
          action: "create",
          timestamp: Date.now(),
          participant_id: participant_id,
          payload: data,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
    })
  } catch (error) {}
}
