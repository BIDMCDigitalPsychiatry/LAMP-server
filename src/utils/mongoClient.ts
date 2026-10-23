import { MongoClient, MongoClientOptions } from "mongodb"

// Builds `MongoClient` options from the environment. Returns `{}` unless TLS is requested.
export function buildMongoOptions(env: NodeJS.ProcessEnv = process.env): MongoClientOptions {
  throw new Error("not implemented")
}

export const mongoClientInstance = new MongoClient(`${process.env.DB}`)
