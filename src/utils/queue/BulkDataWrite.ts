import { RedisClient } from "../../repository/Bootstrap"
import { PubSubAPIListenerQueue } from "./Queue"
import { Repository } from "../../repository/Bootstrap"
import { BulkDataWriteQueue } from "./Queue"

const Max_Store_Size = 20000

/**Bulk data write to database
 *
 * @param key
 * @param participant_id
 * @param data
 */
export const BulkDataWrite = async (key: string, participant_id: string, data: any[]): Promise<void> => {
  switch (key) {
    case "sensor_event":
      console.log("incoming sensor events length", data.length)
      if (data.length === 0 || data.length === undefined) break
      publishSensorEvent(participant_id, [data[data.length - 1]])
      if (data.length === 1) {
        const SensorEventRepository = new Repository().getSensorEventRepository()
        await SensorEventRepository._insert(participant_id, data)
        break
      }
      const Store_Size = (await RedisClient?.llen(participant_id)) as number
      console.log("Store_Size",Store_Size)
      if (Store_Size < Max_Store_Size) {
        console.log("Write to redis store",participant_id)
        for (const event of data) {
          try {
            event.participant_id = participant_id
            event.timestamp = Number.parse(event.timestamp)
            event.sensor = String(event.sensor)
            //Push to redis store
            await RedisClient?.rpush(participant_id, [JSON.stringify(event)])
          } catch (error) {
            console.log("error while pushing to redis store", error)
          }
        }
      } 
      else {
        console.log("Write to db from cache",participant_id)
        PushFromRedis(participant_id)
      }
      break

    default:
      break
  }
}

/** push to db from redis batch wise
 *
 */
async function PushFromRedis(Q_Name: string) {
  const Store_Size = (await RedisClient?.llen(Q_Name)) as number
  console.log("Store_Size to be processed to db for write", `${Q_Name}--${Store_Size}`)
  for (let i = 0; i < Store_Size; i = i + 501) {
    const start = i === 0 ? i : i + 1
    const end = i + 501
    if (start >= Store_Size) break
    
    const Store_Data = (await RedisClient?.lrange(Q_Name, start, end)) as any    
    // SaveSensorEvent(Store_Data)
    BulkDataWriteQueue?.add(
      {
        key: "sensor_event",
        payload: Store_Data,
      },
      {
        attempts: 5, //attempts to do db write if failed
        backoff: 10000, // retry for db insert every 10 seconds if failed
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
  }

  try {
    console.log("---Store_Size to be processed for trimming", `${Q_Name}--${Store_Size}`)
    //Remove data from redis store
    await RedisClient?.ltrim(Q_Name, Store_Size, -1)
  } catch (error) {
    console.log(error)
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

/** save bulk sensor event data
 *
 * @param datas
 */
async function SaveSensorEvent(datas: any[]) {
  const repo = new Repository()
  const SensorEventRepository = repo.getSensorEventRepository()
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
  } catch (error) {
    console.log("db write error", error)
  }
}
