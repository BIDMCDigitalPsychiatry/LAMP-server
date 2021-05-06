/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response, Router } from "express"
import { PushNotificationQueue } from "../utils/queue/Queue"
import { Repository } from "../repository/Bootstrap"

export const PushNotificationAPI = Router()

/**Push notification API--used by external clients to send notifications- supports 3 types:participants,study,activity

 *************************************************************
 Participant based : send notifications to all participants given
 //Request
{
 "type":"participants",  
 "participants":
 [
 {"participant_id":"U1155520779","title":"title1","message":"message1","activity_id":"activity_id1"},
 {"participant_id":"U1155520779","title":"title2","message":"message2","activity_id":"activity_id2"}
 ],
 "schedule: '2020-12-06T10:15:00.000Z' //optional
}
//Response 
{
   "status": true,
   "error": false
}

****************************************************************
Study based : send notifications to all participants under studies given
//Request
{
"type":"study",
 "study":
 [
 {"study":"study1","title":"title1","message":"message1"},
 {"study":"study2","title":"title2","message":"message2"},
 {"study":"study3","title":"title3","message":"message3"}
 ],
 "schedule: '2020-12-06T10:15:00.000Z' //optional
}
//Response 
{
   "status": true,
   "error": false
}

*******************************************************************
activity based : send notifications to all participants for activities given  
//Request
{
"type":"activity",
 "activity":
 [
 {"activityID":"activity1","title":"title1","message":"message1"},
 {"activityID":"activity2","title":"title2","message":"message2"}
 
 ],
 "schedule: '2020-12-06T10:15:00.000Z' //optional
}

//Response 
{
   "status": true,
   "error": false
}
****************************************************************
*
*/
PushNotificationAPI.post("/notifications", async (req: Request, res: Response) => {
  let scheduleTime: any = ""
  let responseMsg: any = { status: true, error: false }
  const repo = new Repository()
  const TypeRepository = repo.getTypeRepository()
  const ParticipantRepository = repo.getParticipantRepository()
  if (undefined !== req.body.schedule) {
    //take schedule time from request
    scheduleTime = req.body.schedule
  } else {
    //set scheduleTime to null, if not given(immediate notification gets fires in this case)
    scheduleTime = ""
  }

  //if type not given(type should be participants,study or activity)
  if (req.body.type === undefined) {
    responseMsg = { status: false, error: true }
    res.status(404).json(responseMsg)
  }

  //processing request
  switch (req.body.type) {
    //Participant based- Prepare notifications to participants given
    case "participants":
      try {
        const Participants: any = req.body.participants
        if (Participants.length === 0) {
          break
        }
        //send notifications to the participants given
        sendToParticipants(Participants, scheduleTime)
        res.status(200).json(responseMsg)
      } catch (error) {
        res.status(parseInt(error.message.split(".")[0]) || 500).json({ error: error.message })
      }
      break

    //study based - Prepare notifications to particpants of given study
    case "study":
      const studyDetails: any = Array.isArray(req.body.study) ? req.body.study : [req.body.study]
      for (const studyDetail of studyDetails) {
        const title = studyDetail.title
        const message = studyDetail.message
        const study: any = studyDetail.study
        try {
          //find the participants of the given study
          const Participants = await ParticipantRepository._select(study, true)
          if (Participants.length === 0) {
            continue
          }
          //form participants payload
          const newParticipants = await prepareParticipants(Participants, title, message, study)
          //send notifications to participants of given study
          sendToParticipants(newParticipants, scheduleTime)
        } catch (error) {
          console.log("Error fetching participants")
        }
      }
      res.status(200).json(responseMsg)
      break

    //activity based - Prepare notifications to particpants for given activity
    case "activity":
      const activityDetails: any = Array.isArray(req.body.activity) ? req.body.activity : [req.body.activity]
      for (const activityDetail of activityDetails) {
        const activityID: any = activityDetail.activityID
        try {
          const title = activityDetail.title
          const message = activityDetail.message

          //find the study of the given activityID
          const parent: any = await TypeRepository._parent(activityID)
          const study = parent["Study"]
          //find the Participants for the given study
          const Participants = await ParticipantRepository._select(study, true)

          if (Participants.length === 0) {
            continue
          }
          //form participants payload
          const newParticipants = await prepareParticipants(Participants, title, message, activityID)
          //send notifications to participants for given activity
          sendToParticipants(newParticipants, scheduleTime)
        } catch (error) {
          console.log("Error fetching participants")
        }
      }
      res.status(200).json(responseMsg)

      break

    default:
      break
  }
})

/**
 *
 * @param Participants
 * @param schedule
 */
async function sendToParticipants(Participants: any, schedule: any): Promise<void> {
  Participants = Array.isArray(Participants) ? Participants : [Participants]
  for (const participant of Participants) {
    try {
      const repo = new Repository()
      const SensorEventRepository = repo.getSensorEventRepository()
      const event_data = await SensorEventRepository._select(
        participant.participant_id,
        "lamp.analytics",
        undefined,
        undefined,
        1000
      )
      if (event_data.length !== 0) {
        const filteredArray: any = await event_data.filter(
          (x: any) =>
            x.data.type === undefined &&
            x.data.action !== "notification" &&
            x.data.device_type !== "Dashboard" &&
            x.data.action !== "logout"
        )
        if (filteredArray.length !== 0) {
          const events: any = filteredArray[0]
          const device = undefined !== events && undefined !== events.data ? events.data : undefined
          if (device !== undefined && (device.device_type || device.device_token || participant.title)) {
            //Schedule the notifications for the time given
            if (schedule !== "" && schedule !== undefined) {
              if (new Date(schedule) > new Date()) {
                let jobId: any = ""
                if (undefined !== participant.activity_id) {
                  jobId = `${participant.participant_id}|${participant.activity_id}|${new Date(schedule).getTime()}`
                } else {
                  jobId = `${participant.participant_id}|${new Date(schedule).getTime()}`
                }
                //get job for given job id
                const PushNotificationQueueJob = await PushNotificationQueue?.getJob(jobId)
                //Remove the job, if one with same job id exists
                if (null !== PushNotificationQueueJob) {
                  await PushNotificationQueueJob?.remove()
                }
                //add to PushNotificationQueue with schedule
                PushNotificationQueue?.add(
                  {
                    device_type: device.device_type.toLowerCase(),
                    device_token: device.device_token,
                    payload: {
                      participant_id: participant.participant_id,
                      title: participant.title,
                      message: participant.message,
                    },
                  },
                  {
                    jobId: jobId,
                    attempts: 3,
                    backoff: 10,
                    removeOnComplete: true,
                    removeOnFail: true,
                    delay: Math.floor(new Date(schedule).getTime() - new Date().getTime()),
                  }
                )
              }
            } else {
              //add to PushNotificationQueue without schedule(immediate push would happen)
              PushNotificationQueue?.add(
                {
                  device_type: device.device_type.toLowerCase(),
                  device_token: device.device_token,
                  payload: {
                    participant_id: participant.participant_id,
                    title: participant.title,
                    message: participant.message,
                  },
                },
                { attempts: 3, backoff: 10, removeOnComplete: true, removeOnFail: true }
              )
            }
          }
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
}

/**
 *
 * @param Participants
 * @param title
 * @param message
 */
async function prepareParticipants(Participants: any, title: any, message: any, customId?: any): Promise<any[]> {
  const newParticipants = []
  if (undefined === customId) customId = ""
  for (const ParticipantsData of Participants) {
    newParticipants.push({ participant_id: ParticipantsData.id, title: title, message: message, activity_id: customId })
  }
  return newParticipants
}
