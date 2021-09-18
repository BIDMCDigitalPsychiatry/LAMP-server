import { RedisClient } from "../../repository/Bootstrap"
import { PubSubAPIListenerQueue } from "./Queue"
import { Repository } from "../../repository/Bootstrap"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()
const Max_Store_Size = 50000

/**Bulk data write to database
 *
 * @param key
 * @param participant_id
 * @param data
 */
export const BulkDataWrite = async (key: string, participant_id: string, data: any[]): Promise<void> => {
  switch (key) {
    case "sensor_event":
      console.log("data length to be published to nats", data.length)
      if (data.length === 0 || data.length === undefined) break
       publishSensorEvent(participant_id, [data[data.length - 1]])
      // const release = await clientLock.acquire()
      // const Store_Size = (await RedisClient?.llen("sensor_event")) as number
      // console.log("Store_Size", Store_Size)
      // console.log("Max_Store_Size", Max_Store_Size)
      // if (Store_Size > Max_Store_Size) {
      //   console.log("Inserting data to redis store when size reaches")
      //   //Insert data to redis store
      //   for (const event of data) {
      //     event.participant_id = participant_id
      //     event.timestamp = Number.parse(event.timestamp)
      //     event.sensor = String(event.sensor)
      //     try {
      //       //Push to redis store
      //       await RedisClient?.rpush("sensor_event", [JSON.stringify(event)])
      //     } catch (error) {
      //       console.log(error)
      //     }
      //   }
      //   const New_Store_Size = (await RedisClient?.llen("sensor_event")) as number
      //   console.log("Preparing for db write of data length", New_Store_Size)
      //   for (let i = 0; i < New_Store_Size; i = i + 501) {
      //     const start = i === 0 ? i : i + 1
      //     const end = i + 501
      //     console.log("start", start)
      //     console.log("end", end)
      //     if (start >= New_Store_Size) break
      //     const Store_Data = (await RedisClient?.lrange("sensor_event", start, end)) as any
      //     saveSensorEvent(Store_Data)
      //   }
      //   console.log("Removing data from redis store")
      //   try {
      //     //Remove data from redis store
      //     await RedisClient?.ltrim("sensor_event", 1, -New_Store_Size)
      //   } catch (error) {
      //     console.log(error)
      //   }
      // } else {
      //   console.log("Inserting data to redis store")
      //   for (const event of data) {
      //     try {
      //       if (event.sensor === "lamp.analytics") {
      //         event.participant_id = participant_id
      //         event.timestamp = Number.parse(event.timestamp)
      //         event.sensor = String(event.sensor)
      //         saveSensorEvent([JSON.stringify(event)])
      //         publishSensorEvent(participant_id, [event])
      //       } else {
      //         event.participant_id = participant_id
      //         event.timestamp = Number.parse(event.timestamp)
      //         event.sensor = String(event.sensor)
      //         //Push to redis store
      //         await RedisClient?.rpush("sensor_event", [JSON.stringify(event)])
      //       }
      //     } catch (error) {
      //       console.log("error while pushing to redis store", error)
      //     }
      //   }
      // }
      // release()
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

/** save bulk sensor event data
 *
 * @param datas
 */
async function saveSensorEvent(datas: any[]) {
  const repo = new Repository()
  const SensorEventRepository = repo.getSensorEventRepository()
  let sensor_events: any[] = []
  for (const data of datas) {
    const participant_id = JSON.parse(data).participant_id
    const sensor_event = JSON.parse(data)
    delete sensor_event.participant_id
    if (process.env.DB?.startsWith("mongodb://")) {
      await sensor_events.push({ ...sensor_event, _parent: participant_id })
    } else {
      await sensor_events.push({ ...sensor_event, "#parent": participant_id })
    }
  }
  console.log('sensor_events',sensor_events)
  try {
    console.log("writing to sensor_event db of data length", sensor_events.length)
    await SensorEventRepository._bulkWrite(sensor_events)
  } catch (error) {
    console.log(error)
  }
}
