import Bull from "bull"

import { RedisClient } from "../../repository/Bootstrap"

//Initialise Scheduler Queue
export const CacheDataQueue = new Bull("CacheData", process.env.REDIS_HOST ?? "")

//Consume job from Scheduler
CacheDataQueue.process(async (job) => {
//Cacheing data in redis for 5 minutes
await  RedisClient?.setex(job.data.key, 300, JSON.stringify(job.data.payload))   
})