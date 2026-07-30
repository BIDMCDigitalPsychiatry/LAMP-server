import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ObjectId, type MongoClient } from "mongodb"
import type { MongoMemoryReplSet } from "mongodb-memory-server"
import { startMemoryMongo } from "../support/mongoMemory"

// Demonstrates the mongodb-memory-server harness and — importantly — the
// load-bearing ordering contract: src/utils/mongoClient.ts captures
// `process.env.DB` at IMPORT time. We start the ephemeral replica set first, set
// the env, and only THEN dynamically import the module, so it binds to the mem
// server. This is the pattern any DB-backed integration test in this repo follows.

let replset: MongoMemoryReplSet
let mongoClientInstance: MongoClient

beforeAll(async () => {
  replset = await startMemoryMongo()
  // Dynamic import AFTER startMemoryMongo() has set process.env.DB.
  ;({ mongoClientInstance } = await import("../../src/utils/mongoClient"))
  await mongoClientInstance.connect()
}, 120_000)

afterAll(async () => {
  await mongoClientInstance?.close()
  await replset?.stop()
})

describe("MongoMemoryReplSet harness", () => {
  it("binds the app's Mongo client to the ephemeral server and round-trips a document", async () => {
    // No db name passed: MongoClient.db() falls back to the one in the URI (lamp_test).
    const db = mongoClientInstance.db()
    expect(db.databaseName).toBe("lamp_test")

    const credentials = db.collection("credential")
    const _id = new ObjectId()
    await credentials.insertOne({ _id, access_key: "demo@example.test", _deleted: false })

    const found = await credentials.findOne({ _id })
    expect(found).toMatchObject({ access_key: "demo@example.test", _deleted: false })
  })
})

// ---------------------------------------------------------------------------
// Template: real better-auth session flow against the mem server.
//
// SKIPPED because it cannot run under Vitest today: importing src/utils/auth
// transitively loads src/repository/mongo/CredentialRepository.ts, which does
// `require("../../utils/accountLockout")` — a CommonJS require of a *.ts module.
// ts-jest/ts-node patch require() to resolve .ts; Vitest hands the literal
// require() to Node, which only resolves .js/.json/.node, so it throws
// "Cannot find module '../../utils/accountLockout'".
//
// To enable: change those `require("…")` calls in the repository layer to ESM
// `import` (or register a .ts require hook). Then this exercises the real session
// path: sign up + sign in via better-auth, then hit a protected route. The
// `skipFullSetupCheck` middleware lets a fresh account through without the full
// account-setup state machine, so only a valid session cookie is needed.
// ---------------------------------------------------------------------------
describe.skip("authenticateSession (real better-auth) — enable after fixing require('*.ts') in the repo", () => {
  it("accepts a request carrying a valid session cookie", async () => {
    const { randomUUID } = await import("crypto")
    const express = (await import("express")).default
    const request = (await import("supertest")).default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { auth, convertSetCookieToCookie } = (await import("../../src/utils/auth")) as any
    const { authenticateSession, skipFullSetupCheck } = await import("../../src/middlewares/authenticateSession")

    const app = express()
    app.get("/whoami", skipFullSetupCheck, authenticateSession, (_req: unknown, res: any) => {
      res.json({ userId: res.locals.user.id })
    })

    const username = `tester_${randomUUID().slice(0, 8)}`
    const password = "Sup3rSecret!pw"
    await auth.api.signUpEmail({
      body: { email: `${username}@example.test`, password, name: username, username, additionalSetupExempt: true },
    })
    const signIn = await auth.api.signInUsername({ returnHeaders: true, body: { username, password } })
    const cookie = convertSetCookieToCookie(signIn.headers)

    const res = await request(app).get("/whoami").set("Cookie", cookie).expect(200)
    expect(res.body.userId).toBeTruthy()
  })
})
