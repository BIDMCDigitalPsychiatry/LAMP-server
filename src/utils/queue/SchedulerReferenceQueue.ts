import Bull from "bull"

//Initialise SchedulerReferenceQueue Queue
export const SchedulerReferenceQueue = new Bull("SchedulerReference", process.env.REDIS_HOST ?? "")
