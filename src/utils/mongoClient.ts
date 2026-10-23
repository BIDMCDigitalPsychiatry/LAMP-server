import { MongoClient, MongoClientOptions } from "mongodb"

// Builds `MongoClient` options from the environment. Returns `{}` unless you configure TLS or
// retryable writes, so existing `DB` connection strings behave exactly as before.
//
// - `DB_TLS=true` turns on TLS.
// - `DOCDB_CA_CERT_PATH` turns on TLS and trusts that CA bundle (for Amazon DocumentDB).
// - With TLS on, retryable writes default to off, because DocumentDB engines before 8.0.2
//   reject them. `DB_RETRY_WRITES=true|false` overrides that default.
export function buildMongoOptions(env: NodeJS.ProcessEnv = process.env): MongoClientOptions {
  const options: MongoClientOptions = {}
  const caFile = env.DOCDB_CA_CERT_PATH
  if (env.DB_TLS === "true" || !!caFile) {
    options.tls = true
    if (caFile) options.tlsCAFile = caFile
    options.retryWrites = false
  }
  const retryWrites = env.DB_RETRY_WRITES
  if (retryWrites !== undefined && retryWrites !== "") {
    if (retryWrites !== "true" && retryWrites !== "false") {
      throw new Error(`DB_RETRY_WRITES must be "true" or "false", not "${retryWrites}"`)
    }
    options.retryWrites = retryWrites === "true"
  }
  return options
}

export const mongoClientInstance = new MongoClient(`${process.env.DB}`, buildMongoOptions(process.env))
