import { RedisClient } from "../../repository/Bootstrap"
import { BulkDataWriteQueue } from "./Queue"
import { Mutex } from "async-mutex"
import { PubSubAPIListenerQueue } from "./Queue"
import { Repository } from "../../repository/Bootstrap"
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
      const release = await clientLock.acquire()
      const Store_Size = (await RedisClient?.llen("sensor_event")) as number
      console.log("Store_Size", Store_Size)
      console.log("Max_Store_Size", Max_Store_Size)
      if (Store_Size > Max_Store_Size) {
        const repo = new Repository()
        const SensorEventRepository = repo.getSensorEventRepository()
        console.log("write data to db directly of size", data.length)
        //write latest data to db
        await SensorEventRepository._insert(participant_id, data)
        console.log("Preparing for db write of data length", Store_Size)
        for (let i = 0; i < Store_Size; i = i + 501) {
          const start = i === 0 ? i : i + 1
          const end = i + 501
          if (start >= Store_Size) break
          const Store_Data = await RedisClient?.lrange("sensor_event", start, end)
          //add to database write queue
          BulkDataWriteQueue?.add({
            key: "sensor_event",
            participant_id: participant_id,
            payload: Store_Data,
          })
        }
        console.log("Removing data from redis store")
        try {
          //Remove data from redis store
          await RedisClient?.ltrim("sensor_event", 1, -Store_Size)
        } catch (error) {
          console.log(error)
        }
      } else {
        console.log("Inserting data to redis store")
        for (const event of data) {
          try {
            if (event.sensor === "lamp.analytics") {
              event.participant_id = participant_id
              event.timestamp = Number.parse(event.timestamp)
              event.sensor = String(event.sensor)
              //add to database write queue
              BulkDataWriteQueue?.add({
                key: "sensor_event",
                participant_id: participant_id,
                payload: [JSON.stringify(event)],
              })
            } else {
              event.participant_id = participant_id
              event.timestamp = Number.parse(event.timestamp)
              event.sensor = String(event.sensor)
              //Push to redis store
              await RedisClient?.rpush("sensor_event", [JSON.stringify(event)])
            }
          } catch (error) {
            console.log("error while pushing to redis store", error)
          }
        }
      }
      release()
      try {
        //publishing data for sensor_event add api((Token will be created in PubSubAPIListenerQueue consumer, as request is assumed as array and token should be created individually)
        PubSubAPIListenerQueue?.add({
          topic: `sensor_event`,
          action: "create",
          timestamp: Date.now(),
          participant_id: participant_id,
          payload: [data[data.length - 1]],
        })

        PubSubAPIListenerQueue?.add({
          topic: `participant.*.sensor_event`,
          action: "create",
          timestamp: Date.now(),
          participant_id: participant_id,
          payload: [data[data.length - 1]],
        })

        PubSubAPIListenerQueue?.add({
          topic: `sensor.*.sensor_event`,
          action: "create",
          timestamp: Date.now(),
          participant_id: participant_id,
          payload: [data[data.length - 1]],
        })

        PubSubAPIListenerQueue?.add({
          topic: `participant.*.sensor.*.sensor_event`,
          action: "create",
          timestamp: Date.now(),
          participant_id: participant_id,
          payload: [data[data.length - 1]],
        })
      } catch (error) {}
      break

    default:
      break
  }
}
