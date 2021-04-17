import { RedisClient } from "../../repository/Bootstrap"
import { BulkDataWriteQueue } from "./BulkDataWriteQueue"
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
      const Store_Size: number = await RedisClient.llen("sensor_event")
      if (Store_Size > Max_Store_Size) {
        //Insert data to redis store
        for (const event of data) {
          event.participant_id = participant_id
          try {
            //Push to redis store
            console.log("Inserting data to redis store")
            await RedisClient.rpush("sensor_event", [JSON.stringify(event)])
          } catch (error) {
            console.log(error)
          }
        }
        const New_Store_Size: number = await RedisClient.llen("sensor_event")
        const Store_Data: any = await RedisClient.lrange("sensor_event", 0, New_Store_Size)
        console.log("Writing to db of data length", New_Store_Size)
        //add to database write queue
        BulkDataWriteQueue.add({
          key: "sensor_event",
          participant_id: participant_id,
          payload: Store_Data,
        })

        console.log("Removing data from redis store")
        try {
          //Remove data from redis store
          await RedisClient.ltrim("sensor_event", 1, -New_Store_Size)
        } catch (error) {
          console.log(error)
        }
      } else {
        console.log("Inserting data to redis store")
        for (const event of data) {
          try {
            if (event.sensor === "lamp.analytics") {
              //add to database write queue
              BulkDataWriteQueue.add({
                key: "sensor_event",
                participant_id: participant_id,
                payload: [event],
              })
            } else {
              event.participant_id = participant_id
              //Push to redis store
              await RedisClient.rpush("sensor_event", [JSON.stringify(event)])
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
