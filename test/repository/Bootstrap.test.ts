import { describe, expect, inject, it } from "vitest"

// Runs only when you start the tests with `DB` set in your shell, against that live database.
// Every other test uses the in-memory replica set from test/setup/globalSetup.ts.
const liveDb = inject("liveDb")
const liveDbName = inject("liveDbName")

describe.skipIf(!liveDb)("Bootstrap (live database)", () => {
  it("creates an admin credential if one does not exist", async () => {
    process.env.DB = liveDb
    process.env.DB_NAME = liveDbName
    const bootstrap = await import("../../src/repository/Bootstrap")
    await bootstrap.Bootstrap()
    const data = await bootstrap.MongoClientDB.collection("credential")
      .find({
        _deleted: false,
        origin: null,
        access_key: "admin",
      })
      .maxTimeMS(60000)
      .toArray()
    expect(data).toHaveLength(1)
  })
})
