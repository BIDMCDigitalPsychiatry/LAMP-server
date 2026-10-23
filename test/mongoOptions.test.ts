import { describe, expect, it } from "vitest"
import { buildMongoOptions } from "../src/utils/mongoClient"

describe("buildMongoOptions", () => {
  it("returns no options by default", () => {
    expect(buildMongoOptions({})).toEqual({})
  })

  it("ignores DB_TLS values other than true", () => {
    expect(buildMongoOptions({ DB_TLS: "false" })).toEqual({})
    expect(buildMongoOptions({ DB_TLS: "" })).toEqual({})
  })

  it("enables TLS and disables retryable writes when DB_TLS=true", () => {
    expect(buildMongoOptions({ DB_TLS: "true" })).toEqual({ tls: true, retryWrites: false })
  })

  it("uses the DocumentDB CA bundle when DOCDB_CA_CERT_PATH is set", () => {
    expect(buildMongoOptions({ DOCDB_CA_CERT_PATH: "/etc/ssl/global-bundle.pem" })).toEqual({
      tls: true,
      tlsCAFile: "/etc/ssl/global-bundle.pem",
      retryWrites: false,
    })
  })

  it("lets DB_RETRY_WRITES override the retryable-writes default", () => {
    expect(buildMongoOptions({ DB_TLS: "true", DB_RETRY_WRITES: "true" })).toEqual({ tls: true, retryWrites: true })
    expect(buildMongoOptions({ DB_RETRY_WRITES: "false" })).toEqual({ retryWrites: false })
    expect(buildMongoOptions({ DB_RETRY_WRITES: "true" })).toEqual({ retryWrites: true })
  })

  it("rejects a DB_RETRY_WRITES value that isn't true or false", () => {
    expect(() => buildMongoOptions({ DB_RETRY_WRITES: "yes" })).toThrow(/DB_RETRY_WRITES/)
  })
})
