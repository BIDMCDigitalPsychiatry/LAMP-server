import Bull from "bull"

import { RedisClient } from "../../repository/Bootstrap"

/** Queue Process
 *
 * @param job
 */
export async function CacheDataQueueProcess(job: Bull.Job<any>): Promise<void> {
  //Cacheing data in redis for 2 minutes
  await RedisClient?.setex(job.data.key, 120, JSON.stringify(job.data.payload))
}
