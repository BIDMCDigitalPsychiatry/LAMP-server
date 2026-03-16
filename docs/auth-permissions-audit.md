# API Route Spec: Permissions, Docs, and SDK

This document defines the desired state for every LAMP API route: what permission tier it should have, whether it belongs in the OpenAPI spec (and therefore the auto-generated SDKs), and whether it should appear in public docs.

The Zags team should use this as the reference for implementing `ApiKeyAccessLevel` values and `authType` arrays on the `feature-api-key-support` branch.

## Permission tiers

| Tier | Description | Server mechanism |
|---|---|---|
| **System Admin** | Root/admin only | authType `[]` + `ApiKeyAccessLevel.SYSTEM_ADMIN` |
| **Researcher+** | Admins and researchers, not participants | authType `["self", "parent"]` + `ApiKeyAccessLevel.RESEARCHER` |
| **Permission Level Access** | All authenticated users, scoped to own resources | authType `["self", "parent"]` + `ApiKeyAccessLevel.STANDARD` |

**Important:** The `"sibling"` permission has been removed from all authType arrays on the `spec-alignment-reference` branch (commit `57a1ce7`). It must not be re-added — it's a security vulnerability that let participants access other participants' data across studies.

## Special case: Event creation

The activity/sensor event POST endpoints are how the mindLAMP app submits data — participants create events under their own ID via session auth. The API reference says "System Admin" but that refers to the `ApiKeyAccessLevel` only. The `authType` must stay as `["self", "parent"]` so session-authenticated participants can still submit their own data.

## Special case: TypeService shared methods

The TypeService `list()`, `get()`, and `set()` methods currently handle both tag and attachment routes through the same `_authorize` call. If tags and attachments need different permission levels, these methods will need to be split or the route handlers will need separate auth checks.

## SDK and docs classification

- **SDK + Docs**: Route is in the OpenAPI spec, generates into LAMP-py/swift/kotlin, and appears in public docs
- **Docs only**: Route is documented but should not generate SDK methods (no mechanism for this yet — needs `x-sdk-exclude` or separate spec)
- **Internal**: Not in the spec, not documented. Lives in server code only.

All SDK auth goes through `LAMP.connect()` — no session/login/OAuth routes should generate into SDKs.

---

## Core data routes (SDK + Docs)

### Researcher

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /researcher` | System Admin | |
| `POST /researcher` | System Admin | |
| `GET /researcher/{id}` | System Admin | Researcher can view own via "me" |
| `PUT /researcher/{id}` | System Admin | Only admins modify researcher accounts |
| `DELETE /researcher/{id}` | System Admin | Only admins delete researcher accounts |

### Study

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /researcher/{id}/study` | Permission Level Access | |
| `GET /study/{id}` | Permission Level Access | |
| `POST /researcher/{id}/study` | Researcher+ | Participants cannot create studies |
| `PUT /study/{id}` | Researcher+ | Participants cannot modify studies |
| `DELETE /study/{id}` | Researcher+ | Participants cannot delete studies |
| `POST /researcher/{id}/study/clone` | Researcher+ | Deep-copy study with activities/sensors |

### Participant

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /study/{id}/participant` | Permission Level Access | |
| `GET /participant/{id}` | Permission Level Access | |
| `POST /study/{id}/participant` | Researcher+ | |
| `PUT /participant/{id}` | Researcher+ | |
| `DELETE /participant/{id}` | Researcher+ | |

### Activity

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /study/{id}/activity` | Permission Level Access | |
| `GET /participant/{id}/activity` | Permission Level Access | Participants need this for the mindLAMP app |
| `GET /activity/{id}` | Permission Level Access | |
| `POST /study/{id}/activity` | Researcher+ | |
| `PUT /activity/{id}` | Researcher+ | |
| `DELETE /activity/{id}` | Researcher+ | |

### Sensor

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /study/{id}/sensor` | Researcher+ | |
| `GET /participant/{id}/sensor` | Permission Level Access | Participants need this for the mindLAMP app |
| `GET /sensor/{id}` | Permission Level Access | Participants need this for the mindLAMP app |
| `POST /study/{id}/sensor` | Researcher+ | |
| `PUT /sensor/{id}` | Researcher+ | |
| `DELETE /sensor/{id}` | Researcher+ | |

### ActivitySpec

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /activity_spec` | Researcher+ | |
| `GET /activity_spec/{id}` | Researcher+ | |
| `POST /activity_spec` | System Admin | |
| `PUT /activity_spec/{id}` | System Admin | |
| `DELETE /activity_spec/{id}` | System Admin | |

### SensorSpec

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /sensor_spec` | Researcher+ | |
| `GET /sensor_spec/{id}` | Researcher+ | |
| `POST /sensor_spec` | System Admin | |
| `PUT /sensor_spec/{id}` | System Admin | |
| `DELETE /sensor_spec/{id}` | System Admin | |

### ActivityEvent

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /participant/{id}/activity_event` | Permission Level Access | |
| `POST /participant/{id}/activity_event` | System Admin | See "Event creation" note above |

### SensorEvent

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /participant/{id}/sensor_event` | Permission Level Access | |
| `GET /researcher/{id}/sensor_event` | Researcher+ | Aggregation query across researcher's studies |
| `POST /participant/{id}/sensor_event` | System Admin | See "Event creation" note above |

### Type (tags, attachments, parent)

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /type/{id}/parent` | Researcher+ | Participants don't need hierarchy navigation |
| `GET /{type}/{id}/tag` | Permission Level Access | List tag keys |
| `GET /{type}/{id}/tag/{key}` | Permission Level Access | Get tag value |
| `PUT /{type}/{id}/tag/{key}/{target}` | Researcher+ | Set/delete tag |
| `GET /{type}/{id}/attachment` | Researcher+ | List attachments |
| `GET /{type}/{id}/attachment/{key}` | Researcher+ | Get attachment |
| `PUT /{type}/{id}/attachment/{key}/{target}` | Researcher+ | Set attachment |

*Note: `{type}` expands to researcher, study, participant, activity, sensor in the OpenAPI spec. Tags and attachments currently share the same TypeService methods — see "shared methods" note above.*

### Credential

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /{type}/{id}/credential` | Researcher+ | |
| `POST /{type}/{id}/credential` | Researcher+ | |
| `PUT /{type}/{id}/credential/{access_key}` | Researcher+ | |
| `DELETE /{type}/{id}/credential/{access_key}` | Researcher+ | |

### API Key

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api-key/{credentialId}` | System Admin | Create API key |
| `GET /api-key/{credentialId}` | System Admin | List API keys |
| `DELETE /api-key/{keyId}` | System Admin | Revoke API key |

### Notifications

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /send/notifications` | System Admin | Push notification dispatch. Currently broken due to gateway migration — needs to be wired to the new gateway. Long-term the server should handle notification dispatch rather than scripts calling the gateway directly. |

### Schema

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /` | None | OpenAPI schema, no auth required |

---

## Routes NOT in the SDK

### Docs only (document but don't generate into SDKs)

These routes are useful for developers deploying, monitoring, or building custom frontends for LAMP, but shouldn't generate into the `LAMP.connect()`-based SDKs. We don't yet have a filtering mechanism — needs `x-sdk-exclude` or a separate spec.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /researcher/{id}/_lookup/{lookup}` | Researcher+ | Dashboard optimization: studies with nested counts |
| `GET /study/{id}/_lookup/{lookup}/mode/{mode}` | Researcher+ | Dashboard optimization: deeply nested participant data |
| `GET /system/version` | System Admin | Server version info (ops/deployment) |
| `GET /system/metrics` | System Admin | Prometheus metrics (ops/monitoring) |
| `GET /system/healthz` | None | K8s liveness probe (ops/deployment) |
| `GET /system/readyz` | None | K8s readiness probe (ops/deployment) |
| `GET /system/sentry/throw-demo-error` | System Admin | Sentry integration testing (ops/deployment) |

### Internal (not in spec, not documented)

These are session/auth routes for the dashboard UI, or informal routes that shouldn't be exposed.

| Endpoint | Purpose |
|---|---|
| `POST /` | JSONata query interface (advanced, internal) |
| `POST /login` | Session login — dashboard only |
| `POST /logout` | Session logout — dashboard only |
| `GET /session-info` | Session introspection — dashboard only |
| `POST /login/{socialProvider}` | OAuth initiation — dashboard only |
| `GET /login/{socialProvider}/callback` | OAuth callback |
| `GET /login/one-time-token/{token}` | OAuth token exchange |
| `POST /link-social/{socialProvider}` | Account linking — dashboard only |
| `POST /credential/clear-account-setup` | Admin account management — dashboard only |
| `POST /setup-2fa` | 2FA configuration — dashboard only |
| `POST /send-2fa` | 2FA code delivery — dashboard only |
| `POST /verify-2fa` | 2FA verification — dashboard only |
| `GET /subscribe/researcher` | SSE stream — dashboard only |
| `POST /researcher/{id}/sensor_event` | Bulk sensor event creation at researcher level — events should be created per-participant |
| `GET /{type_id}/cordinators` | Informal/internal, has typo in route name |

---

## Unimplemented routes (in SDK but not in server)

These exist in the LAMP-py SDK (from the 2019 OpenAPI spec) but return 404 on the server. They should be removed from the spec so they are not regenerated. Do not implement now.

| Endpoint | SDK method |
|---|---|
| `GET /participant` | `Participant.all()` |
| `GET /researcher/{id}/participant` | `Participant.all_by_researcher()` |
| `GET /activity` | `Activity.all()` |
| `GET /researcher/{id}/activity` | `Activity.all_by_researcher()` |
| `GET /sensor` | `Sensor.all()` |
| `GET /researcher/{id}/sensor` | `Sensor.all_by_researcher()` |
| `GET /study` | `Study.all()` |
| `GET /study/{id}/activity_event` | `ActivityEvent.all_by_study()` |
| `GET /researcher/{id}/activity_event` | `ActivityEvent.all_by_researcher()` |
| `GET /study/{id}/sensor_event` | `SensorEvent.all_by_study()` |
| `DELETE /participant/{id}/activity_event` | `ActivityEvent.delete()` |
| `DELETE /participant/{id}/sensor_event` | `SensorEvent.delete()` |

---

## Bug: TypeService cross-type ID lookup

The `GET /{type}/{id}/parent` routes ignore the type prefix in the URL. The `_self_type()` function searches all MongoDB collections to find the ID, so `GET /sensor/{activity-id}/parent` silently returns the activity's parent instead of a 404. The route handler should validate that the ID matches the type in the URL prefix.
