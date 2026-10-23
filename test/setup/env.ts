import { randomBytes } from "crypto"
import { register } from "ts-node"
import { inject } from "vitest"

// Some `src` modules load local `.ts` files with CommonJS `require()` (for example
// `require("../validator/validationRules")`). Vitest hands those calls to Node's own loader, which
// can't resolve `.ts` files, so compile them with ts-node the same way `tsc` does for production.
register({ transpileOnly: true, compilerOptions: { allowJs: false, checkJs: false } })

// Runs in each test worker before the test file imports anything from `src`. Modules that
// read `process.env` at import time (`Bootstrap.ts`, `utils/auth.ts`, `utils/mongoClient.ts`)
// therefore see the in-memory database. Each test file gets its own database name.
process.env.DB = inject("mongoUri")
process.env.DB_NAME = `lamp_test_${randomBytes(6).toString("hex")}`
process.env.BETTER_AUTH_URL = "http://localhost:3000"
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex")
// Researchers would otherwise need an email or SMS 2FA round trip before their API keys work.
// This is the server's own documented switch for that, so the real setup-state checks still run.
process.env.DISABLE_REQUIRE_OAUTH_OR_2FA = "true"
delete process.env.REDIS_HOST
delete process.env.NATS_SERVER
delete process.env.DB_TLS
delete process.env.DOCDB_CA_CERT_PATH
delete process.env.DB_RETRY_WRITES
