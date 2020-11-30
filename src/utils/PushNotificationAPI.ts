/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response, Router } from "express"
import { SensorEventRepository, ParticipantRepository, TypeRepository } from "../repository"
import { PushNotificationQueue } from "../utils/queue/PushNotificationQueue"

export const PushNotificationAPI = Router()

/**Push notification API--used by external clients to send notifications
 *
 *
 */
PushNotificationAPI.post("/notifications", async (req: Request, res: Response) => {
  let scheduleTime: any = ""
  
  if (undefined !== req.body.schedule) {
    scheduleTime = req.body.schedule
  } else {
    //set default time to send notification
    scheduleTime = ""
  }
  if (req.body.type === undefined) {
    res.json(false)
  }
  switch (req.body.type) {
    //Participant based
    case "participants":
      try {
        const Participants: any = req.body.participants
        if (Participants.length === 0) {
          break
        }
        //send notifications
        sendToParticipants(Participants, scheduleTime)
        res.json(true)
      } catch (error) {
        res.status(parseInt(error.message.split(".")[0]) || 500).json({ error: error.message })
      }
      break

    //study based
    case "study":
      try {
        const studyDetails: any = req.body.study
        for (const studyDetail of studyDetails) {
          const title = studyDetail.title
          const message = studyDetail.message
          const study: any = studyDetail.study
          try {
            const Participants = await ParticipantRepository._select(study, true)
            if (Participants.length === 0) {
              break
            }
            const newParticipants = await prepareParticipants(Participants, title, message, study)
            //send notifications
            sendToParticipants(newParticipants, scheduleTime)
          } catch (error) {
            console.log("Error fetching participants")
          }
        }
        res.json(true)
      } catch (error) {
        res.status(parseInt(error.message.split(".")[0]) || 500).json({ error: error.message })
      }
      break

    //activity based
    case "activity":
      try {
        const activityDetails: any = req.body.activity

        for (const activityDetail of activityDetails) {
          const activityID: any = activityDetail.activityID
          try {
            const title = activityDetail.title
            const message = activityDetail.message
            const parent: any = await TypeRepository._parent(activityID)

            const study = parent["Study"]
            const Participants = await ParticipantRepository._select(study, true)
            
            if (Participants.length === 0) {
              break
            }
            const newParticipants = await prepareParticipants(Participants, title, message, activityID)
            //send notifications
            sendToParticipants(newParticipants, scheduleTime)
          } catch (error) {
            console.log("Error fetching participants")
          }
        }

        res.json(true)
      } catch (error) {
        res.status(parseInt(error.message.split(".")[0]) || 500).json({ error: error.message })
      }
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
      const event_data = await SensorEventRepository._select(
        participant.participant_id,
        "lamp.analytics",
        undefined,
        undefined,
        1000
      )
      if (event_data.length !== 0) {
        const filteredArray: any = await event_data.filter(
          (x) => x.data.action !== "notification" && x.data.device_type !== "Dashboard"
        )
        if (filteredArray.length !== 0) {
          const events: any = filteredArray[0]
          const device = undefined !== events && undefined !== events.data ? events.data : undefined
          if (device !== undefined && (device.device_type || device.device_token || participant.title)) {
            if (schedule !== "" && schedule !== undefined) {
              if (new Date(schedule) > new Date()) {
                let jobId: any = ""
                if (undefined !== participant.activity_id) {
                  jobId = `${participant.participant_id}|${participant.activity_id}|${new Date(schedule).getTime()}`
                } else {
                  jobId = `${participant.participant_id}|${new Date(schedule).getTime()}`
                }
                const PushNotificationQueueJob = await PushNotificationQueue.getJob(jobId)
                if (null !== PushNotificationQueueJob) {
                  await PushNotificationQueueJob?.remove
                }
                PushNotificationQueue.add(
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
              PushNotificationQueue.add(
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
