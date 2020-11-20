/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response, Router } from "express"
import { connect, NatsConnectionOptions, Payload } from "ts-nats"

export const ListenerAPI = Router()

//changes in researcher api  
//example token: researcher
//example api listener api in external client:http://localhost:3000/listen/researcher
ListenerAPI.get("/researcher", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.researcher_id) {
    let researcher_id = req.query.researcher_id
    await nc.subscribe(`researcher.*`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (researcher_id === JSON.parse(JSON.parse(msg.data).data).researcher_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.researcher_id) {
    await nc.subscribe(`researcher`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data
        //Send SSE
        // res.write("PPid: " + _id + "\n")
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//changes in study api 
//example token: study
//example api listener api in external client:http://localhost:3000/listen/study
ListenerAPI.get("/researcher/study", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.researcher_id) {
    let researcher_id = req.query.researcher_id
    let sub = await nc.subscribe(`researcher.*.study`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (researcher_id === JSON.parse(JSON.parse(msg.data).data).researcher_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    await nc.subscribe(`study.*`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (study_id === JSON.parse(JSON.parse(msg.data).data).study_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.researcher_id) {
    await nc.subscribe(`study`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data
        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//changes in activity api 
//example token: activity
//example api listener api in external client:http://localhost:3000/listen/activity
ListenerAPI.get("/study/activity", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.activity_id) {
    let activity_id = req.query.activity_id
    let sub = await nc.subscribe(`activity.*`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (activity_id === JSON.parse(JSON.parse(msg.data).data).activity_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    await nc.subscribe(`study.*.activity`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (study_id === JSON.parse(JSON.parse(msg.data).data).study_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.activity_id) {
    await nc.subscribe(`activity`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data
        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//changes in sensor api
//example token: sensor
//example api listener api in external client:http://localhost:3000/listen/sensor
ListenerAPI.get("/study/sensor", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.sensor_id) {
    let sensor_id = req.query.sensor_id
    await nc.subscribe(`sensor.*`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (sensor_id === JSON.parse(JSON.parse(msg.data).data).sensor_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    await nc.subscribe(`study.*.sensor`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (study_id === JSON.parse(JSON.parse(msg.data).data).study_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          console.log("CHANGES IN /study/:study_id/sensor")
          //find the script details from tags database for the subject(if any)
          console.log("message received on", msg.subject, ":", msg.data)
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.sensor_id) {
    await nc.subscribe(`sensor`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data
        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//changes in participant api 
//example token: participant
//example api listener api in external client:http://localhost:3000/listen/participant
ListenerAPI.get("/study/participant", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    await nc.subscribe(`participant.*`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (participant_id === JSON.parse(JSON.parse(msg.data).data).participant_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    await nc.subscribe(`study.*.participant`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (study_id === JSON.parse(JSON.parse(msg.data).data).study_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.participant_id) {
    await nc.subscribe(`participant`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data

        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//register for creation of activity_event 
//example token: participant.U680456029.activity_event.*
ListenerAPI.get("/participant/activity_event", async (req: Request, res: Response) => {
  let participant_id = req.params.participant_id
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    await nc.subscribe(`participant.*.activity_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (participant_id === JSON.parse(JSON.parse(msg.data).data).participant_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.activity_id) {
    let activity_id = req.query.activity_id
    await nc.subscribe(`activity.*.activity_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (activity_id === JSON.parse(JSON.parse(msg.data).data).activity) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data //data: ${JSON.stringify(msg.data)}\n\n;
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.activity_id && undefined !== req.query.participant_id) {
    let activity_id = req.query.activity_id
    let participant_id = req.query.participant_id
    await nc.subscribe(`participant.*.activity.*.activity_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (
          participant_id === JSON.parse(JSON.parse(msg.data).data).participant_id &&
          activity_id === JSON.parse(JSON.parse(msg.data).data).activity
        ) {
          //generate event id

          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.activity_id && undefined === req.query.participant_id) {
    await nc.subscribe(`activity_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        const data = msg.data
        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})

//register for creation sensor_event objects
//example token: participant.U680456029.sensor_event.*
ListenerAPI.get("/participant/sensor_event", async (req: Request, res: Response) => {
  let participant_id = req.params.participant_id
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const nc = await connect({ servers: [`${process.env.NATSServers}`] })
  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    await nc.subscribe(`participant.*.sensor_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        if (participant_id === JSON.parse(JSON.parse(msg.data).data).participant_id) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.sensor) {
    let sensor = req.query.sensor
    await nc.subscribe(`sensor.*.sensor_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        console.log("sensor_")
        const inputSensor = `${JSON.parse(JSON.parse(msg.data).data).sensor}`.split(".")
        const sensor_ = inputSensor[inputSensor.length - 1]
        if (sensor === sensor_) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined !== req.query.sensor && undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    let sensor = req.query.sensor
    await nc.subscribe(`participant.*.sensor.*.sensor_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        const inputSensor = `${JSON.parse(JSON.parse(msg.data).data).sensor}`.split(".")
        const sensor_ = inputSensor[inputSensor.length - 1]
        if (participant_id === JSON.parse(JSON.parse(msg.data).data).participant_id && sensor === sensor_) {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          const data = msg.data
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + data + "\n\n")
        }
      }
    })
  }
  if (undefined === req.query.sensor && undefined === req.query.participant_id) {
    await nc.subscribe(`sensor_event`, (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //generate event id
        const _id = new Date().toLocaleTimeString()
        console.log("CHANGES IN /sensor_event")

        const data = msg.data
        //Send SSE
        res.write("id: " + _id + "\n")
        res.write("data: " + data + "\n\n")
      }
    })
  }
})
