import Bull from "bull"
import { RedisClient } from "../../repository/Bootstrap"
import { BulkDataWriteSlaveQueue } from "./Queue"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()

/** Queue Process
 *
 * @param job
 */
export async function BulkDataWriteQueueProcess(job: Bull.Job<any>): Promise<void> {
  switch (job.data.key) {
    case "sensor_event":
      //wait for same participant with same timestamp
      const release = await clientLock.acquire()
      let write = false      
      const Cache_Size = Number(process.env.CACHE_SIZE)      
      const Store_Size = (await RedisClient?.llen("se_Q")) as number
      let Store_Data = new Array()
      if (Store_Size > Cache_Size) {
        console.log("Store_Size", `${Store_Size}`)
        let Size_ = !!process.env.CACHE_FLUSH_ALL
          ? process.env.CACHE_FLUSH_ALL === "true"
            ? Store_Size
            : Cache_Size
          : Cache_Size
        console.log("Size_ to be processed", `${Size_}`)
        try {
          Store_Data = (await RedisClient?.lrange("se_Q", 0, Size_ - 1)) as any
          write = true
          await RedisClient?.ltrim("se_Q", Size_, -1)
        } catch (error) {
          console.log("error in trimming data", error)
        }
      }
      release()
      console.log("should write", write)
      if (write) {
        //delayed write
        SaveSensorEvent(Store_Data)
        // SaveSensorEvent(Store_Data.slice(20001,40002),15000)
        // SaveSensorEvent(Store_Data.slice(40002,60001),30000)
      }

      break
    default:
      break
  }
}

/** push to db from redis batch wise
 *
 */
async function PushFromRedis(Q_Name: string, Store_Size: number) {
  console.log("Store_Size to be processed for db write", `${Q_Name}--${Store_Size}`)
  for (let i = 0; i < Store_Size; i = i + 501) {
    try {
      const start = i === 0 ? i : i + 1
      const end = i + 501
      if (start >= Store_Size) break
      const Store_Data = (await RedisClient?.lrange(Q_Name, start, end)) as any
      SaveSensorEvent(Store_Data)
    } catch (error) {}
  }
  try {
    console.log("---Store_Size to be processed for trimming", `${Q_Name}--${Store_Size}`)
    //Remove data from redis store
    await RedisClient?.ltrim(Q_Name, Store_Size, -1)
  } catch (error) {
    console.log(error)
  }
}

/** save bulk sensor event data via queue
 *
 * @param datas
 */
async function SaveSensorEvent(datas: any[], delay?: number) {
  if (datas.length > 0) {
    BulkDataWriteSlaveQueue?.add(
      {
        key: "sensor_event",
        payload: datas,
      },
      {
        attempts: 3, //attempts to do db write if failed
        backoff: 10000, // retry for db insert every 10 seconds if failed
        removeOnComplete: true,
        removeOnFail: true,
        delay: delay === undefined ? 1000 : delay,
      }
    )
  }
}
