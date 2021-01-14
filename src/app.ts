require("dotenv").config()
import https from "https"
import nano from "nano"
import express, { Application } from "express"
import cors from "cors"
import morgan from "morgan"
import { customAlphabet } from "nanoid"
import { LegacyAPI, ListenerAPI,PushNotificationAPI, OpenAPISchema, HTTPS_CERT, _bootstrap_db } from "./utils"
import { ActivityScheduler } from "./utils/ActivitySchedulerJob"
import API from "./service"
import {cleanAllQueues} from "./utils/ActivitySchedulerJob"

// The database connection and ID generators for repository classes.
export const Database = nano(process.env.CDB ?? "")
export const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20)
export const numeric_uuid = (): string => `U${Math.random().toFixed(10).slice(2, 12)}`

// Configure the base Express app and middleware.
export const app: Application = express()
app.set("json spaces", 2)
app.use(express.json({ limit: "50mb", strict: false }))
app.use(express.text())
app.use(cors())
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")

  // If we have a dynamic schema available in the database, use that instead of the static one.
  const _openAPIschema = {
    ...((await Database.db.list()).includes("root") ? await Database.use("root").get("#schema") : OpenAPISchema),
    _id: undefined,
    _rev: undefined,
  }
  
  // Establish the API and LegacyAPI routers, as well as a few individual utility routes.
  app.use("/", API)
  app.use("/v0", LegacyAPI)
  
  app.use("/subscribe", ListenerAPI)
  app.use("/send", PushNotificationAPI)
  app.get("/", async (req, res) => res.json(_openAPIschema))
  app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
  app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))
  console.log("Server routing initialized.")

  // Initialize the database or confirm that it is online.
  await _bootstrap_db(Database)

  // Begin running activity/automations scheduling AFTER connecting to the database.
  if (process.env.SCHEDULER === "on") {
     console.log("Clean all queues...")
       await cleanAllQueues();
    console.log("Initializing schedulers...")
      ActivityScheduler()
  } else {
    console.log("Running with schedulers disabled.")
  }
  console.groupEnd()
  console.log("Initialization complete.")

  // Begin listener on port 3000.
  const _server = process.env.HTTPS === "off" ? app : https.createServer(HTTPS_CERT, app)
  _server.listen(process.env.PORT || 3000)
}
main()
