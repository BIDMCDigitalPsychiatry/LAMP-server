import { MongoMemoryReplSet } from "mongodb-memory-server-core"
import type { TestProject } from "vitest/node"

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string
    liveDb: string
    liveDbName: string
  }
}

let replSet: MongoMemoryReplSet | undefined

// Starts a single-node replica set. The first run downloads a `mongod` binary into the
// local cache; later runs reuse it.
export async function setup(project: TestProject): Promise<void> {
  // Keep the caller's own `DB` so the live-database test can opt in to it explicitly.
  project.provide("liveDb", process.env.DB ?? "")
  project.provide("liveDbName", process.env.DB_NAME ?? "")
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } })
  project.provide("mongoUri", replSet.getUri())
}

export async function teardown(): Promise<void> {
  await replSet?.stop()
}
