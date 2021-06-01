import Bull from "bull"
import { setTimeout } from "timers"
import { nc, Repository } from "../../repository/Bootstrap"
import { Mutex } from "async-mutex"
const clientLock = new Mutex()

/** Queue Process
 *
 * @param job
 */
export async function PubSubAPIListenerQueueProcess(job: Bull.Job<any>): Promise<void> {
  let publishStatus = true
  const repo = new Repository()
  const TypeRepository = repo.getTypeRepository()
  const maxPayloadSize = 10000000 //1047846
  try {
    //for the participant api changes
    if (
      (job.data.topic === "study.*.participant" ||
        job.data.topic === "participant.*" ||
        job.data.topic === "participant") &&
      job.data.payload.action === "update"
    ) {
      try {
        const parent: any = await TypeRepository._parent(job.data.payload.participant_id)
        job.data.payload.study_id = parent["Study"]
        //form the token for the consumer
        job.data.token = `study.${parent["Study"]}.participant.${job.data.payload.participant_id}`
      } catch (error) {
        publishStatus = false
        console.log("Error fetching Study")
      }
    }

    //for the study api changes
    if (
      (job.data.topic === "study" || job.data.topic === "study.*" || job.data.topic === "researcher.*.study") &&
      job.data.payload.action === "update"
    ) {
      try {
        const parent: any = await TypeRepository._parent(job.data.payload.study_id)
        job.data.payload.researcher_id = parent["Researcher"]
        //form the token for the consumer
        job.data.token = `researcher.${parent["Researcher"]}.study.${job.data.payload.study_id}`
      } catch (error) {
        publishStatus = false
        console.log("Error fetching participants")
      }
    }

    //for the activity api changes
    if (
      (job.data.topic === "activity" || job.data.topic === "activity.*" || job.data.topic === "study.*.activity") &&
      job.data.payload.action === "update"
    ) {
      try {
        const parent: any = await TypeRepository._parent(job.data.payload.activity_id)
        job.data.payload.study_id = parent["Study"]
        //form the token for the consumer
        job.data.token = `study.${parent["Study"]}.activity.${job.data.payload.activity_id}`
      } catch (error) {
        publishStatus = false
        console.log("Error fetching Study")
      }
    }

    //for the sensor api changes
    if (
      (job.data.topic === "sensor" || job.data.topic === "sensor.*" || job.data.topic === "study.*.sensor") &&
      job.data.payload.action === "update"
    ) {
      try {
        const parent: any = await TypeRepository._parent(job.data.payload.sensor_id)
        job.data.payload.study_id = parent["Study"]
        //form the token for the consumer
        job.data.token = `study.${parent["Study"]}.sensor.${job.data.payload.sensor_id}`
      } catch (error) {
        publishStatus = false
        console.log("Error fetching Study")
      }
    }

    //for the activity_event api changes
    if (
      job.data.topic === "activity_event" ||
      job.data.topic === "participant.*.activity_event" ||
      job.data.topic === "activity.*.activity_event" ||
      job.data.topic === "participant.*.activity.*.activity_event"
    ) {
      for (const payload of job.data.payload) {
        const release = await clientLock.acquire()
        try {
          const Data: any = {}
          payload.topic = job.data.topic
          payload.participant_id = job.data.participant_id
          payload.action = job.data.action
          Data.data = JSON.stringify(payload)
          //form the token for the consumer
          Data.token = `activity.${payload.activity}.participant.${job.data.participant_id}`
          const size = Buffer.byteLength(Data.data)
          //IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE
          if (size > maxPayloadSize) {
            const dataNew: any = {}
            dataNew.data = JSON.stringify({
              activity: payload.activity,
              subject_id: job.data.participant_id,
              timestamp: job.data.timestamp,
            })

            // throw new Error("Nats maximum payload error")
            await publishIDs(job.data.topic, dataNew)
          } else {
            //publish activity_event data seperately
            await publishActivityEvent(payload.topic, Data)
          }
          release()
        } catch (error) {
          release()
          publishStatus = false
          console.log("activity_event_payload_size", Buffer.byteLength(JSON.stringify(payload)))
          console.log("activity_event_payload", payload)
          console.log(error)
        }
      }
      publishStatus = false
    }

    //for the sensor_event api changes (Do not use now, as we have issue in publishing bulk data to nats server)
    if (
      job.data.topic === "sensor_event" ||
      job.data.topic === "participant.*.sensor_event" ||
      job.data.topic === "sensor.*.sensor_event" ||
      job.data.topic === "participant.*.sensor.*.sensor_event"
    ) {
      for (const payload of job.data.payload) {
        const release = await clientLock.acquire()
        try {
          const Data: any = {}
          payload.topic = job.data.topic
          payload.action = job.data.action
          payload.participant_id = job.data.participant_id
          const inputSensor = payload.sensor.split(".")
          const sensor_ = inputSensor[inputSensor.length - 1]
          payload.sensor = sensor_
          Data.data = JSON.stringify(payload)
          //form the token for the consumer
          job.data.token = `sensor.${sensor_}.participant.${payload.participant_id}`
          Data.token = job.data.token
          const size = Buffer.byteLength(Data.data)

          //IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE
          if (size > maxPayloadSize) {
            const dataNew: any = {}
            dataNew.data = JSON.stringify({
              subject_id: job.data.participant_id,
              sensor: payload.sensor,
              timestamp: job.data.timestamp,
            })
            await publishIDs(job.data.topic, dataNew)
          } else {
            //publish sensor_event data seperately
            await publishSensorEvent(payload.topic, Data)
          }
          release()
        } catch (error) {
          release()
          publishStatus = false
          console.log("sensor_event_payload_size", Buffer.byteLength(JSON.stringify(payload)))
          console.log("sensor_event_payload", payload)
          console.log(error)
        }
      }
      publishStatus = false
    }
    //if no error, publish the data to nats
    if (publishStatus) {
      const release = await clientLock.acquire()
      try {
        //initialize Data object to get published for a topic
        const Data: any = {}
        job.data.payload.topic = job.data.topic
        Data.data = JSON.stringify(job.data.payload)
        Data.token = job.data.token
        const size = Buffer.byteLength(Data.data)

        //IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE-TAKE CORRESPONDIG IDs AND PUBLISH
        if (size > maxPayloadSize) {
          const dataNew: any = {}
          switch (job.data.topic) {
            //FOR RESEARCHER APIS
            case "researcher":
            case "researcher.*":
              dataNew.data = JSON.stringify({
                action: job.data.payload.action,
                subject_id: job.data.payload.researcher_id,
              })
              await publishIDs(job.data.topic, dataNew)
              break
            //FOR study APIS
            case "study":
            case "study.*":
            case "researcher.*.study":
              if (job.data.payload.action !== "delete") {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.study_id,
                })
              } else {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.study_id,
                  researcher_id: job.data.payload.researcher_id,
                })
              }
              await publishIDs(job.data.topic, dataNew)
              break
            //FOR participant APIS
            case "participant":
            case "participant.*":
            case "study.*.participant":
              if (job.data.payload.action !== "delete") {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.participant_id,
                })
              } else {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.participant_id,
                  study_id: job.data.payload.study_id,
                })
              }
              await publishIDs(job.data.topic, dataNew)
              break
            //FOR activity APIS
            case "activity":
            case "activity.*":
            case "study.*.activity":
              if (job.data.payload.action !== "delete") {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.activity_id,
                })
                await publishIDs(job.data.topic, dataNew)
              } else {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.activity_id,
                  study_id: job.data.payload.study_id,
                })
              }
              break
            //FOR sensor APIS
            case "sensor":
            case "sensor.*":
            case "study.*.sensor":
              if (job.data.payload.action !== "delete") {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.sensor_id,
                })
                await publishIDs(job.data.topic, dataNew)
              } else {
                dataNew.data = JSON.stringify({
                  action: job.data.payload.action,
                  subject_id: job.data.payload.sensor_id,
                  study_id: job.data.payload.study_id,
                })
              }
              break

            default:
              break
          }
        } else {
          ;(await nc).publish(job.data.topic, Data)
        }
        release()
      } catch (error) {
        release()
        console.log(error)
      }
    }
  } catch (error) {
    console.log("Nats server is disconnected")
  }
}

/** publishing sensor event
 *
 * @param topic
 * @param data
 */
async function publishSensorEvent(topic: any, data: any): Promise<void> {
  try {
    ;(await nc).publish(topic, data)
  } catch (error) {
    console.log("Nats server is disconnected")
  }
}

/** publishing activity event
 *
 * @param topic
 * @param data
 */
async function publishActivityEvent(topic: any, data: any): Promise<void> {
  try {
    ;(await nc).publish(topic, data)
  } catch (error) {
    console.log("Nats server is disconnected")
  }
}

/** publish IDs if size is greater tha maximum payload size
 *
 */
async function publishIDs(topic: string, Data: any): Promise<any> {
  try {
    ;(await nc).publish(topic, Data)
  } catch (error) {
    console.log("Nats server is disconnected")
  }
}
