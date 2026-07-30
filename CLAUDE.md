# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LAMP Server is the backend API for the LAMP (Learn, Assess, Manage, Prevent) digital psychiatry platform by BIDMC (Beth Israel Deaconess Medical Center). It is a TypeScript/Express REST API that manages researchers, studies, participants, activities, sensors, and their associated events. Documentation: https://docs.lamp.digital/

## Commands

- **Build:** `npm run build` (cleans `build/` then compiles TypeScript)
- **Dev server:** `npm run dev` (starts docker-compose services + nodemon with ts-node, requires `.env` file via dotenv-cli)
- **Start (production):** `npm start` (builds then runs `node build/index.js`)
- **Tests:** `npm test` (jest in watch mode); `npm run coverage` (with coverage)
- **Run a single test:** `npx jest test/repository/Bootstrap.test.ts`
- **Lint:** `npm run lint`
- **Basic-auth → better-auth migration:** `npm run migrateBasicAuthServer` (run by setting `DO_UPGRADE_FROM_BASIC_AUTH=true` at server startup, or as a standalone script)
- **Migration data-conflict report:** `npm run runBasicAuthServerReport` (also gated by `RUN_DATA_CONFLICT_REPORT=true` at startup)

## Infrastructure Dependencies

Docker Compose provides local dev services: MongoDB (27017), Redis (6379), NATS (4222), and Mongo Express UI (8081). Start them with `docker compose up -d` (the `dev` script does this automatically).

Required environment variables (set in `.env`): `DB` (MongoDB connection string starting with `mongodb://`), `REDIS_HOST`, `NATS_SERVER`, `ROOT_KEY`, `DASHBOARD_URL`. See README.md for the full list.

## Architecture

### Layered Structure (src/)

The codebase follows a three-layer pattern: **Service -> Repository -> Database**.

- **`model/`** - TypeScript type definitions for domain entities (Researcher, Study, Participant, Activity, Sensor, ActivityEvent, SensorEvent, Credential, etc.)
- **`service/`** - Business logic layer. Each service class (e.g., `ResearcherService`) exposes static methods (`list`, `create`, `get`, `set`) and a static `Router` property with Express route definitions. Services call `_verify()` from `Security.ts` for auth checks before delegating to repositories.
- **`repository/`** - Data access layer with a dual-driver design:
  - `interface/RepositoryInterface.ts` - Defines interfaces for all repositories
  - `mongo/` - MongoDB implementations (the only supported driver going forward)
  - `couch/` - CouchDB implementations (deprecated; the `CDB` env var and Couch driver are no longer used in production)
  - `Bootstrap.ts` - Database initialization, connection setup, and the `Repository` factory class that selects the driver based on the `DB` env var format
- **`middlewares/`** - Express middleware (`authenticateToken`, `validateRequest`)
- **`validator/`** - Request validation rules
- **`utils/`** - Utilities including NATS pub/sub (`ListenerAPI`), push notifications (`PushNotificationAPI`), system info endpoints (`SystemInfoAPI`), Bull job queues (`queue/`), Sentry integration (`sentry.ts`), and an OpenAPI schema

### Key Patterns

- **Database driver selection:** `Bootstrap.ts` detects the DB driver from the `DB` env var format. URLs starting with `mongodb://` use MongoDB; HTTP(S) URLs use CouchDB. The `Repository` class acts as a factory, returning the correct implementation based on the detected driver.
- **Authentication (better-auth):** Sessions are managed by the `better-auth` library. Express routes use the `authenticateSession` middleware (`src/middlewares/authenticateSession.ts`); legacy code paths still reference Basic auth + JWT, but new work should go through better-auth. Several non-obvious customizations:
  - **Credential == User.** The `Credential` model is mapped to better-auth's `User` table. The same record is referred to as "credential" or "user" depending on context, and field names differ between raw DB access and better-auth return values (e.g., `access_key` is aliased to `email`).
  - **Participant sessions never expire; staff sessions do.** Cookie expiry is manually adjusted at creation time, and participant sessions are periodically rotated (a fresh cookie is sent on rotation). Tunable via `PARTICIPANT_SESSION_*` and `STAFF_SESSION_*` env vars.
  - **Do not expose better-auth's API routes directly.** Always call them server-side from Express handlers, and propagate any cookies better-auth sets back onto the Express response when the session may have changed.
- **Authorization (RBAC):** `_verify()` in `Security.ts` implements hierarchical role-based access. Auth types are `"self"`, `"sibling"`, `"parent"`, or `[]` (root-only). It walks the ownership tree via `TypeRepository._owner()`.
- **Service routing:** `service/index.ts` composes all service routers into a single Express Router mounted at `/`. Additional routes: `/subscribe` (NATS listeners), `/send` (push notifications), `/system` (system info).
- **Query API:** `POST /` accepts JSONata expressions evaluated against the full `METHOD_LIST` of service methods, providing a flexible query interface.
- **Event publishing:** CRUD operations publish events to NATS via Bull queues (`PubSubAPIListenerQueue`) for real-time subscriptions.
- **Encryption:** `Encrypt`/`Decrypt` in `Bootstrap.ts` support Rijndael (AES-256-ECB with `DB_KEY`) and AES256 (AES-256-CBC with `ROOT_KEY`).

### Test Setup

Tests use `ts-jest` with a global setup at `src/test/setup.js`. Test files live in `test/` mirroring the `src/` structure. The jest config requires a running MongoDB instance (tests hit a real database).

### Pre-commit

Husky runs `lint-staged` on commit, which type-checks (`tsc --noEmit`) all staged `.ts` files.
