#!/usr/bin/env node
// scripts/createTestHierarchy.mjs
//
// Standalone utility that creates a Researcher -> Study -> Participant chain
// against a RUNNING LAMP-server, using ONLY HTTP requests. It imports nothing
// from this repository and needs no database access -- it only assumes the
// endpoints this server exposes.
//
// Why it logs in as the root admin:
//   Creating a Researcher is root-only (Security._authorize(user, []) in
//   src/service/Security.ts). Studies and participants could be created by the
//   owning researcher, but to make the whole chain in one shot we authenticate
//   as root. The server seeds a root admin credential (origin: null) on first
//   bootstrap and prints a random password ONCE to the console
//   (see src/repository/Bootstrap.ts and README step 7). Use that password.
//
// Usage:
//   BASE_URL=http://localhost:3000 \
//   ADMIN_ACCESS_KEY=admin \
//   ADMIN_SECRET_KEY='<the-admin-password-printed-at-first-startup>' \
//   node scripts/createTestHierarchy.mjs
//
// Output: diagnostics go to stderr; the final JSON { researcherId, studyId,
// participantId } is printed to stdout so it can be piped/captured.
//
// Requires Node 18+ (global fetch + Headers.getSetCookie()).

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:8083").replace(/\/+$/, "")
const ACCESS_KEY = process.env.ADMIN_ACCESS_KEY ?? "admin"
const SECRET_KEY = process.env.ADMIN_SECRET_KEY

// Researcher/study names must satisfy the server's validator:
//   /^[A-Za-z0-9\s_]+$/, non-empty, <= 50 chars (src/validator/validationRules.js).
// Date.now() is digits-only, so it is safe to embed for uniqueness.
const stamp = Date.now()
const RESEARCHER_NAME = process.env.RESEARCHER_NAME ?? `Test Researcher ${stamp}`
const STUDY_NAME = process.env.STUDY_NAME ?? `Test Study ${stamp}`

if (!SECRET_KEY) {
  console.error(
    "ERROR: ADMIN_SECRET_KEY is required.\n" +
      "It is the root administrator password printed ONCE when the server first\n" +
      "bootstrapped its database (README step 7). Set it and re-run, e.g.:\n\n" +
      "  ADMIN_SECRET_KEY='<password>' node scripts/createTestHierarchy.mjs\n",
  )
  process.exit(1)
}

// --- tiny cookie jar so we forward the better-auth session cookie, and pick up
// --- any rotated cookie the auth middleware sets on later responses.
const cookieJar = new Map()

function updateCookies(res) {
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")]
        : []
  for (const raw of setCookies) {
    const pair = raw.split(";")[0] // drop attributes (Path, HttpOnly, Expires, ...)
    const eq = pair.indexOf("=")
    if (eq === -1) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (name) cookieJar.set(name, value)
  }
}

function cookieHeader() {
  return [...cookieJar].map(([k, v]) => `${k}=${v}`).join("; ")
}

async function api(method, path, body, { auth = true } = {}) {
  const headers = { "Content-Type": "application/json" }
  if (auth) {
    const cookie = cookieHeader()
    if (!cookie) throw new Error("No session cookie available; did login succeed?")
    headers.Cookie = cookie
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  updateCookies(res) // capture initial + any rotated session cookie

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${JSON.stringify(json)}`)
  }
  return json
}

// 1. Log in as the root admin. POST /login sets the session cookie and returns
//    the login payload ({ accessKey, userType, me, ... }).
const login = await api("POST", "/login", { accessKey: ACCESS_KEY, secretKey: SECRET_KEY }, { auth: false })
if (!cookieHeader()) {
  throw new Error(`Login for "${ACCESS_KEY}" returned no Set-Cookie. Response: ${JSON.stringify(login)}`)
}
console.error(`Logged in as "${ACCESS_KEY}" (userType=${login.userType ?? "root"}).`)

// 2. Create the researcher (root-only). Response: { data: "<researcher_id>" }.
const researcherRes = await api("POST", "/researcher", { name: RESEARCHER_NAME })
const researcherId = researcherRes.data
if (typeof researcherId !== "string") {
  throw new Error(`Unexpected /researcher response: ${JSON.stringify(researcherRes)}`)
}
console.error(`Created researcher: ${researcherId}`)

// 3. Create the study under that researcher. Response: { data: "<study_id>" }.
const studyRes = await api("POST", `/researcher/${encodeURIComponent(researcherId)}/study`, { name: STUDY_NAME })
const studyId = studyRes.data
if (typeof studyId !== "string") {
  throw new Error(`Unexpected /study response: ${JSON.stringify(studyRes)}`)
}
console.error(`Created study: ${studyId}`)

// 4. Create the participant under that study. Response: { data: { id: "<participant_id>" } }.
const participantRes = await api("POST", `/study/${encodeURIComponent(studyId)}/participant`, {})
const participantId = participantRes?.data?.id ?? participantRes?.data
if (typeof participantId !== "string") {
  throw new Error(`Unexpected /participant response: ${JSON.stringify(participantRes)}`)
}
console.error(`Created participant: ${participantId}`)

// Final machine-readable result on stdout. _parent(participantId) on the server
// will now resolve to { Study: studyId, Researcher: researcherId }.
console.log(JSON.stringify({ researcherId, studyId, participantId }, null, 2))
