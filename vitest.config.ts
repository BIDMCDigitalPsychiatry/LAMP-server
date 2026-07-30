import { defineConfig } from "vitest/config"

// Two test projects:
//   - "unit":        colocated `src/**/*.test.ts`, pure, no infra. Fast.
//   - "integration": `test/integration/**`, in-process supertest. A single test
//                    (auth.session) spins up an ephemeral MongoMemoryReplSet on
//                    demand; the rest mock their collaborators and touch no DB.
//
// `globals: false` (the default) is intentional: the codebase pre-commit runs a
// strict `tsc --noEmit`, so we import { describe, it, expect, vi } from "vitest"
// explicitly rather than rely on ambient globals (which would need a tsconfig
// "types" entry). Removing @types/jest also drops the old ambient describe/it.
export default defineConfig({
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["test/**", "build/**", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["test/integration/**/*.integration.test.ts"],
          // mongodb-memory-server may download a mongod binary on first run, and
          // boots a replica set in a beforeAll hook — give it generous timeouts.
          testTimeout: 60_000,
          hookTimeout: 120_000,
          // Run integration files serially in one fork so at most one ephemeral
          // mongod is alive at a time.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test/**", "src/index.ts"],
    },
  },
})
