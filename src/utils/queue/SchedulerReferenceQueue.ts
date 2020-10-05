import Bull from "bull"
import { queueOpts } from "../../app"

//Initialise SchedulerReferenceQueue Queue
export const SchedulerReferenceQueue = new Bull("SchedulerReference", queueOpts)
