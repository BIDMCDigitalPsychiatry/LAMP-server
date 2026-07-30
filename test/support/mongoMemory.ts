import { MongoMemoryReplSet } from "mongodb-memory-server"

/**
 * Starts an ephemeral single-node MongoDB replica set for integration tests and
 * points the application's import-time env at it.
 *
 * ORDERING CONTRACT — this is the load-bearing detail:
 * `src/utils/mongoClient.ts` (`new MongoClient(process.env.DB)`) and
 * `src/utils/auth.ts` (`betterAuth(...)`) read process.env at *import* time. So
 * callers MUST await this BEFORE importing those modules. The robust pattern is to
 * call it in `beforeAll` and then `await import("../../src/utils/auth")` afterwards
 * (a dynamic import guarantees the env is already set when the module evaluates).
 *
 * A replica set (not a standalone) is required because better-auth / the Mongo
 * driver use transactions, and wiredTiger is required for transaction support.
 */
export async function startMemoryMongo(): Promise<MongoMemoryReplSet> {
  const replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  })

  // Explicit db name: the app sets no DB_NAME, so MongoClient.db(undefined) falls
  // back to the database encoded in the connection string.
  process.env.DB = replset.getUri("lamp_test")
  process.env.BETTER_AUTH_SECRET ??= "integration-test-secret"
  process.env.ROOT_KEY ??= "0".repeat(64) // 32-byte hex, only used if legacy hashing is on

  return replset
}
