import request from "supertest"
import type { Application } from "express"
import type { Db } from "mongodb"
import * as BootstrapModule from "../../src/repository/Bootstrap"
import { Repository } from "../../src/repository/Bootstrap"
import { auth } from "../../src/utils/auth"
import { mongoClientInstance } from "../../src/utils/mongoClient"
import { formatPrimaryKey, SetupStates } from "../../src/utils/accountSecurityUtilities"

// Initializes the in-memory database through the real `Bootstrap`, without Redis or NATS.
export async function bootTestDatabase(): Promise<Db> {
  await BootstrapModule.Bootstrap({ connectMessaging: false })
  return BootstrapModule.MongoClientDB as Db
}

export async function closeTestDatabase(): Promise<void> {
  await mongoClientInstance.close()
}

export type Account = { accessKey: string; secretKey: string }

export type Fixtures = {
  researcherA: string
  researcherB: string
  studyA: string
  participant: string
  sibling: string
  // `Authorization: Bearer <mobile token>` from `POST /login`.
  participantBearer: string
  siblingBearer: string
  // `Authorization: Basic <access:secret>`, the legacy mobile header.
  participantBasic: string
  // better-auth API keys, sent as `x-api-key`.
  researcherAKey: string
  researcherBKey: string
}

// Creates two researchers, a study owned by researcher A, and two participants in that study.
// Every credential goes through `CredentialRepository._insert` (better-auth `signUpEmail`), the
// mobile tokens come from `POST /login`, and the API keys from better-auth's `createApiKey`, the
// same call `ApiKeyService.create` makes.
export async function createFixtures(app: Application, db: Db): Promise<Fixtures> {
  const repo = new Repository()
  const researcherA = await repo.getResearcherRepository()._insert({ name: "Researcher A" })
  const researcherB = await repo.getResearcherRepository()._insert({ name: "Researcher B" })
  const studyA = await repo.getStudyRepository()._insert(researcherA, { name: "Study A" })
  const participant: string = (await repo.getParticipantRepository()._insert(studyA, {})).id
  const sibling: string = (await repo.getParticipantRepository()._insert(studyA, {})).id

  const participantAccount = await createCredential(participant, "participant")
  const siblingAccount = await createCredential(sibling, "participant")
  const researcherAAccount = await createCredential(researcherA, "researcher")
  const researcherBAccount = await createCredential(researcherB, "researcher")

  return {
    researcherA,
    researcherB,
    studyA,
    participant,
    sibling,
    participantBearer: `Bearer ${await mobileToken(app, participantAccount)}`,
    siblingBearer: `Bearer ${await mobileToken(app, siblingAccount)}`,
    participantBasic: `Basic ${Buffer.from(`${participantAccount.accessKey}:${participantAccount.secretKey}`).toString(
      "base64"
    )}`,
    researcherAKey: await createApiKey(db, researcherAAccount.accessKey),
    researcherBKey: await createApiKey(db, researcherBAccount.accessKey),
  }
}

async function createCredential(origin: string, userType: "participant" | "researcher"): Promise<Account> {
  const account = { accessKey: `${origin}@lamp.test`, secretKey: `secret-${origin}` }
  // The sign-up hook recomputes the setup state; with `DISABLE_REQUIRE_OAUTH_OR_2FA=true`
  // (test/setup/env.ts) it resolves to `NOT_REQUIRED` for researchers as well.
  await new Repository().getCredentialRepository()._insert(origin, {
    origin,
    access_key: account.accessKey,
    secret_key: account.secretKey,
    description: `${userType} fixture`,
    user_type: userType,
    account_setup_state: SetupStates.NOT_REQUIRED,
  })
  return account
}

async function mobileToken(app: Application, account: Account): Promise<string> {
  const res = await request(app).post("/login").send(account)
  if (res.status !== 200 || !res.body?.mobileAuth?.accessToken) {
    throw new Error(`login failed for ${account.accessKey}: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.mobileAuth.accessToken
}

async function createApiKey(db: Db, accessKey: string): Promise<string> {
  const credential = await db.collection("credential").findOne({ access_key: accessKey })
  if (!credential) throw new Error(`no credential for ${accessKey}`)
  const created = await auth.api.createApiKey({
    body: {
      userId: formatPrimaryKey(credential._id.toString()) as any,
      rateLimitMax: 1000,
      name: "fixture key",
    },
  })
  return created.key
}
