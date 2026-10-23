import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Starts one in-memory MongoDB replica set for the whole run.
    globalSetup: ["./test/setup/globalSetup.ts"],
    // Points `DB` and `DB_NAME` at that replica set before any `src` module loads.
    setupFiles: ["./test/setup/env.ts"],
    pool: "forks",
    // Print console output only for failing tests; Bootstrap logs a lot.
    silent: "passed-only",
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
})
