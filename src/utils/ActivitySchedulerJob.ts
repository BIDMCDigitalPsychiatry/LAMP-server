import { ActivityRepository, TypeRepository, ParticipantRepository, SensorEventRepository } from "../repository"
import { SchedulerQueue } from "../utils/queue/SchedulerQueue"
import { SchedulerReferenceQueue } from "../utils/queue/SchedulerReferenceQueue"

/// List activities for a given ID; if a Participant ID is not provided, undefined = list ALL.
export const ActivityScheduler = async (id?: string): Promise<void> => {
  try {
    const activities: any[] =
      id === undefined ? await ActivityRepository._select() : await ActivityRepository._select(id)
    console.log("activity_id given", id)
    console.log("Saving to redis")
    console.log(`Processing ${activities.length} activities for push notifications.`)
    // Process activities to find schedules and corresponding participants.
    for (const activity of activities) {
      if (undefined !== activity.id) {
        //remove all jobs created for the an activity from queue
        await removeActivityJobs(activity.id)
      }
      // If the activity has no schedules, ignore it.
      if (activity.schedule.length === 0) continue
      // Get all the participants of the study that the activity belongs to.
      const parent: any = await TypeRepository._parent(activity.id)
      const participants = await ParticipantRepository._select(parent["Study"])

      // Iterate all schedules, and if the schedule should be fired at this instant, iterate all participants
      // and their potential device tokens for which we will send the device push notifications.
      for (const schedule of activity.schedule) {        
        const Participants: any[] = []
        for (const participant of participants) {
          try {
            // Collect the Participant's device token, if there is one saved.
            const events = await SensorEventRepository._select(participant.id, "lamp.analytics")
            const device = events.find((x) => x.data?.device_token !== undefined)?.data
            if (device === undefined || device.device_token.length === 0) continue
            //take Device_Tokens and ParticipantIDs
            if (participant.id) {
              Participants.push({
                participant_id: participant.id,
                device_token: device.device_token,
                device_type: device.device_type.toLowerCase(),
              })
            }
          } catch (error) {
            console.log("Error fetching Participant Device.")
            console.error(error)
          }
        }
        const cronStr = await getCronScheduleString(schedule)
        //if participants exists
        if (Participants !== []) {          
          if (schedule.repeat_interval !== "custom") {
            if (activity.id) {
              const scheduler_payload: any = {
                title: activity.name,
                message: `You have a mindLAMP activity waiting for you: ${activity.name}.`,
                activity_id: activity.id,
                participants: Participants,
              }
              //add the payload to schedular queue
              const SchedulerjobResponse = await SchedulerQueue.add(scheduler_payload, {
                removeOnComplete: true,
                removeOnFail: true,
                backoff: 10,
                attempts: 2,
                repeat: { jobId: activity.id, cron: cronStr },
              })
              //updating ShedulerReference Queue(if already activity_id exists as JobId)
              const SchedulerReferenceJob = await SchedulerReferenceQueue.getJob(activity.id)
              if (null !== SchedulerReferenceJob) {
                const SchedulerReferenceIds: any = SchedulerReferenceJob.data.scheduler_ref_ids
                await SchedulerReferenceIds.push(SchedulerjobResponse.id)
                await SchedulerReferenceJob.update({
                  scheduler_ref_ids: SchedulerReferenceIds,
                  activity_id: activity.id,
                })
              } else {
                //add to scheduler reference queue
                await SchedulerReferenceQueue.add(
                  { scheduler_ref_ids: [SchedulerjobResponse.id], activity_id: activity.id },
                  { jobId: activity.id }
                )
              }
            }
          } else {
            if(schedule.repeat_interval === "none") {
              const scheduler_payload: any = {
                title: activity.name,
                message: `You have a mindLAMP activity waiting for you: ${activity.name}.`,
                activity_id: activity.id,
                participants: Participants,
              }
              await SchedulerQueue.add(scheduler_payload, {
                removeOnComplete: true,
                removeOnFail: true,
                backoff: 10,
                attempts: 2,               
               },{delay: new Date(schedule.time).getMilliseconds()})
            } else {
            //As the custom time might appear as multiple, process it seperately
            const activity_details: {} = { name: activity.name, activity_id: activity.id, cronStr: cronStr }
            await setCustomSchedule(activity_details, Participants)
            }
          }
        }
      }
    }
    console.log("Saving to Redis completed....")
  } catch (error) {
    console.log("Encountered an error in handling the queue job.")
    console.error(error)
  }
}

//Get the cron string for each schedule
function getCronScheduleString(schedule: any): string {
  let cronStr = ""
  //feed date time
  const feedDateTime = new Date(schedule.time)
  const followingDay = new Date(new Date(schedule.time).getTime() + 86400000) // + 1 day in ms
  let feedUTCNewHours = ""
  //get hour,minute,second formatted time from feed date time
  let feedHoursUtc: any = feedDateTime.getUTCHours()
  let feedMinutesUtc: any = feedDateTime.getUTCMinutes()
  
  // const dayNumber: number = new Date(feedDateTime).getUTCDay()
  const feedMonth: number = new Date(feedDateTime).getUTCMonth() + 1
  const sheduleDayNumber: number = new Date(feedDateTime).getUTCDay()
  const sheduleMonthDate: number = new Date(feedDateTime).getUTCDate()
  //prepare cronstring for various schedules
  switch (schedule.repeat_interval) {
    case "triweekly":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} * * 1,3,5`

      break
    case "biweekly":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} * * 2,4`
      break
    case "weekly":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} * * ${sheduleDayNumber}`
      break
    case "daily":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} * * *`
      break
    case "custom":
      schedule.custom_time.map((time: any) => {
        //get hour,minute,second from each of the custom time array
        let customHoursUtc: any = new Date(time).getUTCHours()
        let customMinutesUtc: any = new Date(time).getUTCMinutes()       
        //set the multiple cron string  with identifier '|'
        cronStr += `${customMinutesUtc} ${customHoursUtc} * * *|`
      })
      break
    case "hourly":
      cronStr = `${feedMinutesUtc} */1 * * *`
      break
    case "every3h":
      followingDay.toLocaleDateString()
      while (feedDateTime < followingDay) {
        feedDateTime.setUTCHours(feedDateTime.getUTCHours() + 3)
        feedUTCNewHours +=
          feedDateTime < followingDay ? `${feedDateTime.getUTCHours()},` : `${feedDateTime.getUTCHours()}`

        cronStr = `${feedMinutesUtc} ${feedUTCNewHours} * * *`
      }
      break
    case "every6h":
      followingDay.toLocaleDateString()
      while (feedDateTime < followingDay) {
        feedDateTime.setUTCHours(feedDateTime.getUTCHours() + 6)
        feedUTCNewHours +=
          feedDateTime < followingDay ? `${feedDateTime.getUTCHours()},` : `${feedDateTime.getUTCHours()}`

        cronStr = `${feedMinutesUtc} ${feedUTCNewHours} * * *`
      }
      break
    case "every12h":
      followingDay.toLocaleDateString()
      while (feedDateTime < followingDay) {
        feedDateTime.setUTCHours(feedDateTime.getUTCHours() + 12)
        feedUTCNewHours +=
          feedDateTime < followingDay ? `${feedDateTime.getUTCHours()},` : `${feedDateTime.getUTCHours()}`
        cronStr = `${feedMinutesUtc} ${feedUTCNewHours} * * *`
      }
      break
    case "monthly":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} ${sheduleMonthDate} * *`
      break
    case "bimonthly":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} 10,20 * *`
      break
    case "none":
      cronStr = `${feedMinutesUtc} ${feedHoursUtc} ${sheduleMonthDate} ${feedMonth} *`
      break

    default:
      break
  }
  return cronStr
}

//set custom schedule to the queue
async function setCustomSchedule(activity: any, Participants: string[]): Promise<any> {
  
  //split and get individual cron string
  let cronArr = activity.cronStr.split("|")
  for (const cronCustomString of cronArr) {
    if (undefined !== cronCustomString && "" !== cronCustomString) {
      //take hour,minute and seconds of  cron string
      const cronCustomArr = cronCustomString.split(" ")
      //custom schedules may occur in multiple times and also need to run daily.
      if (activity.activity_id) {
        const scheduler_payload: any = {
          title: activity.name,
          message: `You have a mindLAMP activity waiting for you: ${activity.name}.`,
          activity_id: activity.activity_id,
          participants: Participants,
        }
        //add to schedular queue
        try {
          const SchedulerjobResponse = await SchedulerQueue.add(scheduler_payload, {
            removeOnComplete: true,
            removeOnFail: true,
            backoff: 10,
            attempts: 2,
            repeat: { jobId: activity.activity_id, cron: cronCustomString },
          })
          const SchedulerReferenceJob = await SchedulerReferenceQueue.getJob(activity.activity_id)
          //updating ShedulerReference Queue, if the activity is not saved (make activity.id as job id)
          if (null !== SchedulerReferenceJob) {
            const SchedulerReferenceIds: any = SchedulerReferenceJob.data.scheduler_ref_ids
            await SchedulerReferenceIds.push(SchedulerjobResponse.id)
            await SchedulerReferenceJob.update({
              scheduler_ref_ids: SchedulerReferenceIds,
              activity_id: activity.activity_id,
            })
          } else {
            //add to scheduler reference queue(as we cannot make custom id for repeatable job, we need a reference of schedular jobids)
            await SchedulerReferenceQueue.add(
              { scheduler_ref_ids: [SchedulerjobResponse.id], activity_id: activity.activity_id },
              { jobId: activity.activity_id }
            )
          }
        } catch (error) {
          console.log(error)
        }
      }
    }
  }
}

//Remove activities from the queue for a given activity_id, if exists
export async function removeActivityJobs(activity_id: string): Promise<any> {
  try {
    //fetch all jobs from the SchedulerReference
    const SchedulerReferenceJob = await SchedulerReferenceQueue.getJob(activity_id)
    if (null !== SchedulerReferenceJob) {
      const SchedulerReferenceIds: any = SchedulerReferenceJob.data.scheduler_ref_ids
      for (const shedulerId of SchedulerReferenceIds) {
        const SchedulerJob = await SchedulerQueue.getJob(shedulerId)
        await SchedulerJob?.remove()
      }

      //remove from sheduler reference job
      await SchedulerReferenceJob?.remove()
      //remove repeatable job object
      await removeRepeatableJob(activity_id)
    }
  } catch (error) {
    console.log("Error encountered while removing the jobs")
  }
}
//Remove repeatable jobs for given activity_id
async function removeRepeatableJob(activity_id: string): Promise<void> {
  const repeatableJobs = await SchedulerQueue.getRepeatableJobs()
  const job = await repeatableJobs.filter((job) => job.key.includes(activity_id))
  for (let index = 0; index < job.length; index++) {
    await SchedulerQueue.removeRepeatableByKey(job[index].key)
  }
}

//Add/remove device detail to the scheduler while login
export async function updateDeviceDetails(activityIDs: any, device_details: any): Promise<void> {
  //form the device detail to be saved, if login.Otherwise, it would be for delete
  const Device =
    device_details.device_token !== undefined
      ? {
          participant_id: device_details.participant_id,
          device_token: device_details.device_token,
          device_type: device_details.device_type.toLowerCase(),
        }
      : undefined
  //Initialise array to store scheduler details to be updated
  const SheduleToUpdate: any = []
  //get the schedulerIds for each activity_id, if present
  for (const activityID of activityIDs) {
    const SchedulerReferenceJobs: any = await SchedulerReferenceQueue.getJob(activityID)
    if (null !== SchedulerReferenceJobs) {
      //take sheduler ids to find scheduler job
      for (const shedulerId of SchedulerReferenceJobs.data.scheduler_ref_ids) {
        //get job details from Sheduler
        const SchedulerJob = await SchedulerQueue.getJob(shedulerId)
        //get the participants for an scheduler id 
        const participants: any = SchedulerJob?.data.participants
        if (undefined !== participants) {
          const participantID = await participants.filter((participant: any) =>
            participant.participant_id.includes(device_details.participant_id)
          )
          if (undefined !== participantID) {
            SheduleToUpdate.push({
              index: participants.indexOf(participantID[0]),
              shedulerId: shedulerId,
            })
          }
        }
      }
    }
  }
  //update device details of a participant
  for (const updateDetail of SheduleToUpdate) {
    const SchedulerJob = await SchedulerQueue.getJob(updateDetail.shedulerId)
    if (null != SchedulerJob) {
      const newParticipants: any = await SchedulerJob?.data.participants
      //remove the participant with old device details (if exists)
      if (-1 !== updateDetail.index) {
        await newParticipants.splice(updateDetail.index, 1)
      }
      //mode =1-add sensor_event, mode=2-delete sensor_event
      if (device_details.mode === 1) {
        await newParticipants.push(Device)
      }
      //Prepare scheduler data
      const data = {
        title: SchedulerJob?.data.title,
        message: SchedulerJob?.data.message,
        activity_id: SchedulerJob?.data.activity_id,
        participants: newParticipants,
      }
      //update scheduler with new participant
      await SchedulerJob?.update(data)
    }
  }
}
