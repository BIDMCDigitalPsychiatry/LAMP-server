import Bull from "bull"
import { setTimeout } from "timers"
import { connect, NatsConnectionOptions, Payload } from "ts-nats"
import { TypeRepository, ParticipantRepository } from "../../repository"
//Initialise PubSubAPIListenerQueue Queue
export const PubSubAPIListenerQueue = new Bull("PubSubAPIListener", process.env.REDIS_HOST ?? "")

PubSubAPIListenerQueue.process(async (job: any) => {
  let publishStatus = true
  try {
    //connect to nats server
    const nc = await natsConnect()   
    
    //for the participant api changes
    if ((job.data.topic === "study.*.participant"|| job.data.topic === "participant.*" ||
         job.data.topic === "participant") && job.data.payload.action === "update") {
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
    if ((job.data.topic === "study" || 
         job.data.topic === "study.*" || 
         job.data.topic === "researcher.*.study")
       && job.data.payload.action === "update") {
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
    if ((job.data.topic === "activity" || job.data.topic === "activity.*" ||
         job.data.topic === "study.*.activity" ) && job.data.payload.action === "update") {
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
    if ((job.data.topic === "sensor" || job.data.topic === "sensor.*" ||
    job.data.topic === "study.*.sensor" ) && job.data.payload.action === "update") {
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
    if (job.data.topic === "activity_event" || 
        job.data.topic === "participant.*.activity_event" ||
        job.data.topic === "activity.*.activity_event" || 
        job.data.topic === "participant.*.activity.*.activity_event") {
      for (const payload of job.data.payload) {
        try {
          const Data: any = {}
          payload.topic = job.data.topic
          payload.participant_id = job.data.participant_id
          payload.action = job.data.action
          Data.data = JSON.stringify(payload)
          //form the token for the consumer
          Data.token = `activity.${payload.activity}.participant.${job.data.participant_id}`

          //publish activity_event data seperately
          await publishActivityEvent(payload.topic, Data)
        } catch (error) {
          publishStatus = false
          console.log("Error creating token")
        }
      }
      publishStatus = false
    } 

    //for the sensor_event api changes (Do not use now, as we have issue in publishing bulk data to nats server)
    if (job.data.topic ===  "sensor_event" || 
       job.data.topic === "participant.*.sensor_event" ||  
       job.data.topic === "sensor.*.sensor_event" ||
       job.data.topic === "participant.*.sensor.*.sensor_event") {
      for (const payload of job.data.payload) {
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

          //publish sensor_event data seperately
          await publishSensorEvent(payload.topic, Data)
        } catch (error) {
          publishStatus = false
          console.log("Error creating token")
        }
      }
      publishStatus = false
    }   
    //if no error, publish the data to nats  
    if (publishStatus) {
      //initialize Data object to get published for a topic
      const Data: any = {}
      job.data.payload.topic = job.data.topic
      Data.data = JSON.stringify(job.data.payload)      
      Data.token = job.data.token
      await nc.publish(job.data.topic, Data)
    }
  } catch (error) {
    console.log(error)
  }
})

/** publishing sensor event
 *
 * @param topic
 * @param data
 */
async function publishSensorEvent(topic: any, data: any): Promise<void> {
  try {
    const nc = await natsConnect()
    await nc.publish(topic, data)
  } catch (error) {}
}

/** publishing activity event
 *
 * @param topic
 * @param data
 */
async function publishActivityEvent(topic: any, data: any): Promise<void> {
  try {
    const nc = await natsConnect()
    await nc.publish(topic, data)
  } catch (error) {}
}

/** Nats server connect
 *
 */
async function natsConnect(): Promise<any> {
  try {
    const nc = await connect({
      servers: [`${process.env.NATS_SERVER}`],
      payload: Payload.JSON
    })
    return nc
  } catch (error) {}
}
