require("dotenv").config()
import API from "./service"
import express, { Application } from "express"
import bodyParser from "body-parser"
import https from "https"
import nano from "nano"
import cors from "cors"
import morgan from "morgan"
import { customAlphabet } from "nanoid"
import { LegacyAPI } from "./utils/LegacyAPI"
import { ActivityScheduler, HTTPS_CERT, _bootstrap_db } from "./utils"

// the database
export const Database = nano(process.env.CDB ?? "")
// crockford-32
export const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20)
// internal format
export const numeric_uuid = (): string => `U${Math.random().toFixed(10).slice(2, 12)}`

// Configure the base Express app and middleware.
export const app: Application = express()
app.set("json spaces", 2)
app.use(bodyParser.json({ limit: "50mb", strict: false }))
app.use(bodyParser.text())
app.use(cors())
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")
  const _openAPIschema = {
    ...(await Database.use("root").get("#schema")),
    _id: undefined,
    _rev: undefined,
  }

  // Establish the API routes.
  app.use("/", API)
  app.use("/v0", LegacyAPI)

  // Establish misc. routes.
  app.get("/", async (req, res) => res.json(_openAPIschema))
  app.get("/favicon.ico", (req, res) => res.status(204))
  app.get("/service-worker.js", (req, res) => res.status(204))
  app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

  // Initialize the database or confirm that it is online.
  await _bootstrap_db(Database)

  // Begin running activity/automations scheduling AFTER connecting to the database.
  if (process.env.SCHEDULER === "on") {
    console.log("Initializing schedulers...")
    setInterval(async () => {
      await ActivityScheduler()
      //await TypeRepository._process_triggers()
    }, 60 * 1000 /* every 1m */)
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
