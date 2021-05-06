import { RedisClient } from "../../repository/Bootstrap"
import { BulkDataWriteQueue } from "./Queue"
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
      const release = await clientLock.acquire()
      const Store_Size = (await RedisClient?.llen("sensor_event")) as number
      if (Store_Size > Max_Store_Size) {
        console.log("Inserting data to redis store")
        //Insert data to redis store
        for (const event of data) {
          event.participant_id = participant_id
          try {
            //Push to redis store
            await RedisClient?.rpush("sensor_event", [JSON.stringify(event)])
          } catch (error) {
            console.log(error)
          }
        }
        const New_Store_Size = (await RedisClient?.llen("sensor_event")) as number
        for (let i = 0; i < New_Store_Size; i = i + 501) {
          const start = i === 0 ? i : i + 1
          const end = i + 501
          if (start >= New_Store_Size) break
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
          await RedisClient?.ltrim("sensor_event", 1, -New_Store_Size)
        } catch (error) {
          console.log(error)
        }
      } else {
        console.log("Inserting data to redis store")
        for (const event of data) {
          try {
            if (event.sensor === "lamp.analytics") {
              event.participant_id = participant_id
              //add to database write queue
              BulkDataWriteQueue?.add({
                key: "sensor_event",
                participant_id: participant_id,
                payload: [JSON.stringify(event)],
              })
            } else {
              event.participant_id = participant_id
              //Push to redis store
              await RedisClient?.rpush("sensor_event", [JSON.stringify(event)])
            }
          } catch (error) {
            console.log(error)
          }
        }
      }
      release()
      break

    default:
      break
  }
}
