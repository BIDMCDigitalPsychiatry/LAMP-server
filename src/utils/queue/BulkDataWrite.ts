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
      console.log("incoming sensor events length", data.length)
      if (data.length === 0 || data.length === undefined) break     

      const Q_List = await RedisClient?.lrange("se_names_Q", 0, 0)
      console.log("Qnames", Q_List)
      let Q_Name: string = ""
      if (Q_List !== undefined && Q_List.length !== 0) {
        const Store_Size = (await RedisClient?.llen(Q_List[0])) as number
        if (Store_Size < Max_Store_Size) {
          Q_Name = Q_List[0]          
        }
      }
      let create_new_queue = false
      if (Q_Name === "") {
        create_new_queue = true
        console.log(Date.now())
        Q_Name = `se_Q:${Math.floor(Math.random() * 1000000) + 1}${Date.now()}`  
         
      }
      console.log("Q_name generated", Q_Name)
      for (const event of data) {
        try {
          if (event.sensor === "lamp.analytics") {
            event.participant_id = participant_id
            event.timestamp = Number.parse(event.timestamp)
            event.sensor = String(event.sensor)
            publishSensorEvent(participant_id, [event]) 
            SaveSensorEvent([JSON.stringify(event)])
          } else {
            event.participant_id = participant_id
            event.timestamp = Number.parse(event.timestamp)
            event.sensor = String(event.sensor)
            //Push to redis store
            await RedisClient?.rpush(Q_Name, [JSON.stringify(event)])
          }
        } catch (error) {
          console.log("error while pushing to redis store", error)
          return
        }
      }
      if (create_new_queue === true) {
        await RedisClient?.lpush("se_names_Q", Q_Name)
      }
      //function to push to db from redis store
      PushFromRedis()
      break

    default:
      break
  }
}

/** push to db from redis batch wise
 *
 */
async function PushFromRedis() {
  // const release = await clientLock.acquire()
  const Q_Len = (await RedisClient?.llen("se_names_Q")) as number
  console.log("Q Length of se names", Q_Len)
  var Q_Name = ""
  if (Q_Len > 1) {
    Q_Name = (await RedisClient?.rpop("se_names_Q")) as string
    console.log("Data Queue to be processed to db", Q_Name)
  }
  // release()  
  if (Q_Name != "") {
    const Store_Size = (await RedisClient?.llen(Q_Name)) as number
    for (let i = 0; i < Store_Size; i = i + 501) {
      const start = i === 0 ? i : i + 1
      const end = i + 501      
      if (start >= Store_Size) break
      const Store_Data = (await RedisClient?.lrange(Q_Name, start, end)) as any
      SaveSensorEvent(Store_Data)
    }
    console.log("Removing data from redis store")
    try {
      //Remove data from redis store
      // await RedisClient?.ltrim(Q_Name, 1, -Store_Size)
      await RedisClient?.del(Q_Name)
    } catch (error) {
      console.log(error)
    }
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
    console.log("writing to sensor_event db of data length", sensor_events.length)
    await SensorEventRepository._bulkWrite(sensor_events)
  } catch (error) {
    console.log("db write error",error)
  }
}
