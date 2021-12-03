/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response, Router } from "express"
import { nc, Repository } from "../repository/Bootstrap"
export const ListenerAPI = Router()

// //changes in researcher api
// //example token: researcher
// //example api listener api in external client:http://localhost:3000/listen/researcher
ListenerAPI.get("/researcher", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const repo = new Repository()
  const ResearcherRepository = repo.getResearcherRepository()

  if (undefined !== req.query.researcher_id) {
    let researcher_id = req.query.researcher_id
    ;(await nc).subscribe(`researcher.*`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          if (researcher_id === JSON.parse(msg.data.data).subject_id) {
            try {
              if (JSON.parse(msg.data.data).action !== "delete") {
                if (!!ID) {
                  const data = await ResearcherRepository._select(ID)
                  //IF DATA EXISTS
                  if (!!data[0]) {
                    //PREPARE VALUES TO BE SENT
                    let data_: any = {}
                    data_ = JSON.parse(msg.data.data)
                    data_ = { ...data_, name: data[0].name, researcher_id: ID, topic: "researcher.*" }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `researcher.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              } else {
                if (researcher_id === ID) {
                  //generate event id
                  const _id = new Date().toLocaleTimeString()
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = msg.data.data
                  //APPENDING TOKEN
                  Data.token = `researcher.${ID}`

                  //Send SSE
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } catch (err) {}
          }
        } else {
          if (researcher_id === JSON.parse(msg.data.data).researcher_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.researcher_id) {
    ;(await nc).subscribe(`researcher`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                const data = await ResearcherRepository._select(ID)
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  data_ = JSON.parse(msg.data.data)
                  data_ = { ...data_, name: data[0].name, researcher_id: ID, topic: "researcher" }
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = JSON.stringify(data_)
                  //APPENDING TOKEN
                  Data.token = `researcher.${ID}`
                  const _id = new Date().toLocaleTimeString()
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } else {
              const _id = new Date().toLocaleTimeString()
              let Data: any = {}
              //APPENDING DATA
              Data.data = msg.data.data
              //APPENDING TOKEN
              Data.token = `researcher.${ID}`

              //Send SSE
              res.write("id: " + _id + "\n")
              res.write("data: " + JSON.stringify(Data) + "\n\n")
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
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
  const repo = new Repository()
  const StudyRepository = repo.getStudyRepository()
  const TypeRepository = repo.getTypeRepository()

  if (undefined !== req.query.researcher_id) {
    let researcher_id = req.query.researcher_id
    ;(await nc).subscribe(`researcher.*.study`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await StudyRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let researcherID: any = ""
                  data_ = JSON.parse(msg.data.data)
                  try {
                    researcherID = await TypeRepository._owner(ID)
                  } catch (error) {}
                  if (researcher_id === researcherID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      researcher_id: researcherID,
                      study_id: ID,
                      topic: "researcher.*.study",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `researcher.${researcherID}.study.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              const researcherID: any = JSON.parse(msg.data.data).researcherID ?? ""
              if (researcher_id === researcherID) {
                const _id = new Date().toLocaleTimeString()
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `researcher.${researcherID}.study.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (researcher_id === JSON.parse(msg.data.data).researcher_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    ;(await nc).subscribe(`study.*`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await StudyRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  let researcherID: any = ""
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  data_ = JSON.parse(msg.data.data)
                  try {
                    researcherID = await TypeRepository._owner(ID)
                  } catch (err) {}
                  if (study_id === ID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      researcher_id: researcherID,
                      study_id: ID,
                      topic: "study.*",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `researcher.${researcherID}.study.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              if (study_id === ID) {
                const researcherID: any = JSON.parse(msg.data.data).researcher_id ?? ""
                const _id = new Date().toLocaleTimeString()
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `researcher.${researcherID}.study.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (study_id === JSON.parse(msg.data.data).study_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.researcher_id) {
    ;(await nc).subscribe(`study`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await StudyRepository._select(ID)
                } catch (error) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let researcherID: any = ""
                  try {
                    researcherID = await TypeRepository._owner(ID)
                  } catch (error) {}

                  data_ = JSON.parse(msg.data.data)
                  data_ = {
                    ...data_,
                    name: data[0].name,
                    study_id: ID,
                    researcher_id: researcherID,
                    topic: "study",
                  }
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = JSON.stringify(data_)
                  //APPENDING TOKEN
                  Data.token = `researcher.${researcherID}.study.${ID}`
                  const _id = new Date().toLocaleTimeString()
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } else {
              const _id = new Date().toLocaleTimeString()
              const researcherID = JSON.parse(msg.data.data).researcher_id
              let Data: any = {}
              Data.data = msg.data.data
              // //APPENDING TOKEN
              Data.token = `researcher.${researcherID}.study.${ID}`
              //Send SSE
              res.write("id: " + _id + "\n")
              res.write("data: " + JSON.stringify(Data) + "\n\n")
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
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
  const repo = new Repository()
  const ActivityRepository = repo.getActivityRepository()
  const TypeRepository = repo.getTypeRepository()

  if (undefined !== req.query.activity_id) {
    let activity_id = req.query.activity_id
    ;(await nc).subscribe(`activity.*`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  data_ = JSON.parse(msg.data.data)
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}
                  if (activity_id === ID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      activity_id: ID,
                      topic: "activity.*",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.activity.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              if (activity_id === ID) {
                const _id = new Date().toLocaleTimeString()
                const studyID = JSON.parse(msg.data.data).study_id
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.activity.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (activity_id === JSON.parse(msg.data.data).activity_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    ;(await nc).subscribe(`study.*.activity`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  let studyID: any = ""
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  data_ = JSON.parse(msg.data.data)
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (err) {}
                  if (study_id === studyID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      activity_id: ID,
                      topic: "study.*.activity",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.activity.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              const studyID: any = JSON.parse(msg.data.data).study_id
              if (study_id === studyID) {
                const _id = new Date().toLocaleTimeString()

                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.activity.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (study_id === JSON.parse(msg.data.data).study_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.activity_id) {
    ;(await nc).subscribe(`activity`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityRepository._select(ID)
                } catch (error) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}

                  data_ = JSON.parse(msg.data.data)
                  data_ = {
                    ...data_,
                    name: data[0].name,
                    activity_id: ID,
                    study_id: studyID,
                    topic: "activity",
                  }
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = JSON.stringify(data_)
                  //APPENDING TOKEN
                  Data.token = `study.${studyID}.activity.${ID}`
                  const _id = new Date().toLocaleTimeString()
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } else {
              const _id = new Date().toLocaleTimeString()
              const studyID = JSON.parse(msg.data.data).study_id
              let Data: any = {}
              Data.data = msg.data.data
              // //APPENDING TOKEN
              Data.token = `study.${studyID}.activity.${ID}`
              //Send SSE
              res.write("id: " + _id + "\n")
              res.write("data: " + JSON.stringify(Data) + "\n\n")
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
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
  const repo = new Repository()
  const SensorRepository = repo.getSensorRepository()
  const TypeRepository = repo.getTypeRepository()

  if (undefined !== req.query.sensor_id) {
    let sensor_id = req.query.sensor_id
    ;(await nc).subscribe(`sensor.*`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  data_ = JSON.parse(msg.data.data)
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}
                  if (sensor_id === ID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      sensor_id: ID,
                      topic: "sensor.*",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.sensor.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              if (sensor_id === ID) {
                const _id = new Date().toLocaleTimeString()
                const studyID = JSON.parse(msg.data.data).study_id
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.sensor.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (sensor_id === JSON.parse(msg.data.data).sensor_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    ;(await nc).subscribe(`study.*.sensor`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  let studyID: any = ""
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  data_ = JSON.parse(msg.data.data)
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (err) {}
                  if (study_id === studyID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      sensor_id: ID,
                      topic: "study.*.sensor",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.sensor.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              const studyID: any = JSON.parse(msg.data.data).study_id ?? ""
              if (study_id === studyID) {
                const _id = new Date().toLocaleTimeString()
                //APPENDING DATA
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.sensor.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (study_id === JSON.parse(msg.data.data).study_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.sensor_id) {
    ;(await nc).subscribe(`sensor`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorRepository._select(ID)
                } catch (error) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}

                  data_ = JSON.parse(msg.data.data)
                  data_ = {
                    ...data_,
                    name: data[0].name,
                    sensor_id: ID,
                    study_id: studyID,
                    topic: "sensor",
                  }
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = JSON.stringify(data_)
                  //APPENDING TOKEN
                  Data.token = `study.${studyID}.sensor.${ID}`
                  const _id = new Date().toLocaleTimeString()
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } else {
              const _id = new Date().toLocaleTimeString()
              const studyID = JSON.parse(msg.data.data).study_id
              //APPENDING DATA
              let Data: any = {}
              Data.data = msg.data.data
              // //APPENDING TOKEN
              Data.token = `study.${studyID}.sensor.${ID}`
              //Send SSE
              res.write("id: " + _id + "\n")
              res.write("data: " + JSON.stringify(Data) + "\n\n")
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
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
  const repo = new Repository()
  const ParticipantRepository = repo.getParticipantRepository()
  const TypeRepository = repo.getTypeRepository()

  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    ;(await nc).subscribe(`participant.*`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ParticipantRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  data_ = JSON.parse(msg.data.data)
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}
                  if (participant_id === ID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      participant_id: ID,
                      topic: "participant.*",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.participant.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              if (participant_id === ID) {
                const _id = new Date().toLocaleTimeString()
                const studyID = JSON.parse(msg.data.data).participant_id
                //APPENDING DATA
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.participant.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (participant_id === JSON.parse(msg.data.data).participant_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()

            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.study_id) {
    let study_id = req.query.study_id
    ;(await nc).subscribe(`study.*.participant`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ParticipantRepository._select(ID)
                } catch (err) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  let studyID: any = ""
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  data_ = JSON.parse(msg.data.data)

                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (err) {}
                  if (study_id === studyID) {
                    data_ = {
                      ...data_,
                      name: data[0].name,
                      study_id: studyID,
                      participant_id: ID,
                      topic: "study.*.participant",
                    }

                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `study.${studyID}.participant.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                }
              }
            } else {
              const studyID: any = JSON.parse(msg.data.data).study_id ?? ""
              if (study_id === studyID) {
                const _id = new Date().toLocaleTimeString()
                let Data: any = {}
                Data.data = msg.data.data
                // //APPENDING TOKEN
                Data.token = `study.${studyID}.participant.${ID}`
                //Send SSE
                res.write("id: " + _id + "\n")
                res.write("data: " + JSON.stringify(Data) + "\n\n")
              }
            }
          } catch (err) {}
        } else {
          if (study_id === JSON.parse(msg.data.data).study_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.study_id && undefined === req.query.participant_id) {
    ;(await nc).subscribe(`participant`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ParticipantRepository._select(ID)
                } catch (error) {}
                //IF DATA EXISTS
                if (!!data[0]) {
                  //PREPARE VALUES TO BE SENT
                  let data_: any = {}
                  let studyID: any = ""
                  try {
                    studyID = await TypeRepository._owner(ID)
                  } catch (error) {}

                  data_ = JSON.parse(msg.data.data)
                  data_ = {
                    ...data_,
                    name: data[0].name,
                    participant_id: ID,
                    study_id: studyID,
                    topic: "participant",
                  }
                  let Data: any = {}
                  //APPENDING DATA
                  Data.data = JSON.stringify(data_)
                  //APPENDING TOKEN
                  Data.token = `study.${studyID}.participant.${ID}`
                  const _id = new Date().toLocaleTimeString()
                  res.write("id: " + _id + "\n")
                  res.write("data: " + JSON.stringify(Data) + "\n\n")
                }
              }
            } else {
              //generate event id
              const _id = new Date().toLocaleTimeString()
              const studyID: any = JSON.parse(msg.data.data).study_id ?? ""
              let Data: any = {}
              Data.data = msg.data.data
              // //APPENDING TOKEN
              Data.token = `study.${studyID}.participant.${ID}`
              //Send SSE
              res.write("id: " + _id + "\n")
              res.write("data: " + JSON.stringify(Data) + "\n\n")
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
      }
    })
  }
})

//register for creation of activity_event
//example token: participant.U680456029.activity_event.*
ListenerAPI.get("/participant/activity_event", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const repo = new Repository()
  const ActivityEventRepository = repo.getActivityEventRepository()

  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    ;(await nc).subscribe(`participant.*.activity_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const activityID: any = JSON.parse(msg.data.data).activity ?? ""
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityEventRepository._select(ID, activityID, timestamp)
                  if (participant_id === JSON.parse(msg.data.data).subject_id) {
                    for (const payload of data) {
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        action: "create",
                        activity_id: payload.activity,
                        temporal_slices: payload.temporal_slices,
                        static_data: payload.static_data,
                        topic: "participant.*.activity_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `activity.${payload.activity}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (participant_id === JSON.parse(msg.data.data).participant_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.activity_id) {
    let activity_id = req.query.activity_id
    ;(await nc).subscribe(`activity.*.activity_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const activityID: any = JSON.parse(msg.data.data).activity ?? ""
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityEventRepository._select(ID, activityID, timestamp)
                  if (activity_id === activityID) {
                    for (const payload of data) {
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        action: "create",
                        activity_id: payload.activity,
                        temporal_slices: payload.temporal_slices,
                        static_data: payload.static_data,
                        topic: "activity.*.activity_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `activity.${payload.activity}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (activity_id === JSON.parse(msg.data.data).activity) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.activity_id && undefined !== req.query.participant_id) {
    let activity_id = req.query.activity_id
    let participant_id = req.query.participant_id
    ;(await nc).subscribe(`participant.*.activity.*.activity_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const activityID: any = JSON.parse(msg.data.data).activity ?? ""
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityEventRepository._select(ID, activityID, timestamp)
                  if (participant_id === ID && activity_id === activityID) {
                    for (const payload of data) {
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        activity_id: payload.activity,
                        action: "create",
                        temporal_slices: payload.temporal_slices,
                        static_data: payload.static_data,
                        topic: "participant.*.activity.*.activity_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `activity.${payload.activity}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (
            participant_id === JSON.parse(msg.data.data).participant_id &&
            activity_id === JSON.parse(msg.data.data).activity
          ) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.activity_id && undefined === req.query.participant_id) {
    ;(await nc).subscribe(`activity_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const activityID: any = JSON.parse(msg.data.data).activity ?? ""
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await ActivityEventRepository._select(ID, activityID, timestamp)
                  for (const payload of data) {
                    let data_: any = {}
                    data_ = JSON.parse(msg.data.data)
                    data_ = {
                      ...data_,
                      action: "create",
                      activity_id: payload.activity,
                      temporal_slices: payload.temporal_slices,
                      static_data: payload.static_data,
                      topic: "activity_event",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `activity.${payload.activity}.participant.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
      }
    })
  }
})

//register for creation sensor_event objects
//example token: participant.U680456029.sensor_event.*
ListenerAPI.get("/participant/sensor_event", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  const repo = new Repository()
  const SensorEventRepository = repo.getSensorEventRepository()
  if (undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    ;(await nc).subscribe(`participant.*.sensor_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const sensorID: any = JSON.parse(msg.data.data).sensor ?? "" //LAMP.acc...
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorEventRepository._select(ID, sensorID, timestamp)
                  if (participant_id === JSON.parse(msg.data.data).subject_id) {
                    for (const payload of data) {
                      const inputSensor = payload.sensor.split(".")
                      const sensor_ = inputSensor[inputSensor.length - 1]
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        action: "create",
                        sensor: sensor_,
                        data: payload.data,
                        topic: "participant.*.sensor_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `sensor.${sensor_}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (participant_id === JSON.parse(msg.data.data).participant_id) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.sensor) {
    let sensor: string = req.query.sensor as string
    ;(await nc).subscribe(`sensor.*.sensor_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const sensorID: any = JSON.parse(msg.data.data).sensor ?? "" //LAMP.acc..
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorEventRepository._select(ID, sensorID, timestamp)
                  if (`LAMP.${sensor}`.toLowerCase() === sensorID.toLowerCase()) {
                    for (const payload of data) {
                      const inputSensor = payload.sensor.split(".")
                      const sensor_ = inputSensor[inputSensor.length - 1]
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        action: "create",
                        sensor: sensor_,
                        data: payload.data,
                        topic: "sensor.*.sensor_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `sensor.${sensor_}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (sensor.toLowerCase() === JSON.parse(msg.data.data).sensor.toLowerCase()) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined !== req.query.sensor && undefined !== req.query.participant_id) {
    let participant_id = req.query.participant_id
    let sensor: string = req.query.sensor as string 
    ;(await nc).subscribe(`participant.*.sensor.*.sensor_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const sensorID: any = JSON.parse(msg.data.data).sensor ?? "" //LAMP.acc..
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorEventRepository._select(ID, sensorID, timestamp)
                  if (`LAMP.${sensor}`.toLowerCase() === sensorID.toLowerCase()) {
                    for (const payload of data) {
                      const inputSensor = payload.sensor.split(".")
                      const sensor_ = inputSensor[inputSensor.length - 1]
                      let data_: any = {}
                      data_ = JSON.parse(msg.data.data)
                      data_ = {
                        ...data_,
                        action: "create",
                        sensor: sensor_,
                        data: payload.data,
                        topic: "participant.*.sensor.*.sensor_event",
                      }
                      let Data: any = {}
                      //APPENDING DATA
                      Data.data = JSON.stringify(data_)
                      //APPENDING TOKEN
                      Data.token = `sensor.${sensor_}.participant.${ID}`
                      const _id = new Date().toLocaleTimeString()
                      res.write("id: " + _id + "\n")
                      res.write("data: " + JSON.stringify(Data) + "\n\n")
                    }
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          if (
            participant_id === JSON.parse(msg.data.data).participant_id &&
            sensor.toLowerCase() === JSON.parse(msg.data.data).sensor.toLowerCase()
          ) {
            //generate event id
            const _id = new Date().toLocaleTimeString()
            //APPENDING DATA
            let Data: any = {}
            Data.data = msg.data.data
            // //APPENDING TOKEN
            Data.token = msg.data.token
            //Send SSE
            res.write("id: " + _id + "\n")
            res.write("data: " + JSON.stringify(Data) + "\n\n")
          }
        }
      }
    })
  }
  if (undefined === req.query.sensor && undefined === req.query.participant_id) {
    ;(await nc).subscribe(`sensor_event`, async (err, msg) => {
      if (err) {
        console.log("error while subscribing", msg)
      } else {
        //IF SUBJECT ID IS GIVEN, TAKE DATA FROM DB USING THE PUBLISHED ID AND SEND (IF SIZE GREATER THAN NATS PAYLOAD MAX SIZE)
        if (!!JSON.parse(msg.data.data).subject_id) {
          try {
            if (JSON.parse(msg.data.data).action !== "delete") {
              const ID: any = JSON.parse(msg.data.data).subject_id ?? ""
              const timestamp: any = JSON.parse(msg.data.data).timestamp ?? ""
              const sensorID: any = JSON.parse(msg.data.data).sensor ?? ""
              if (!!ID) {
                let data: any[] = []
                try {
                  data = await SensorEventRepository._select(ID, sensorID, timestamp)
                  for (const payload of data) {
                    const inputSensor = payload.sensor.split(".")
                    const sensor_ = inputSensor[inputSensor.length - 1]
                    let data_: any = {}
                    data_ = JSON.parse(msg.data.data)
                    data_ = {
                      ...data_,
                      sensor: sensor_,
                      data: payload.data,
                      topic: "sensor_event",
                    }
                    let Data: any = {}
                    //APPENDING DATA
                    Data.data = JSON.stringify(data_)
                    //APPENDING TOKEN
                    Data.token = `sensor.${sensor_}.participant.${ID}`
                    const _id = new Date().toLocaleTimeString()
                    res.write("id: " + _id + "\n")
                    res.write("data: " + JSON.stringify(Data) + "\n\n")
                  }
                } catch (error) {}
              }
            }
          } catch (err) {}
        } else {
          //generate event id
          const _id = new Date().toLocaleTimeString()
          //APPENDING DATA
          let Data: any = {}
          Data.data = msg.data.data
          // //APPENDING TOKEN
          Data.token = msg.data.token
          //Send SSE
          res.write("id: " + _id + "\n")
          res.write("data: " + JSON.stringify(Data) + "\n\n")
        }
      }
    })
  }
})
