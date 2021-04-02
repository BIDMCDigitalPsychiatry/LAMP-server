require("dotenv").config()
import https from "https"
import express, { Application } from "express"
import cors from "cors"
import morgan from "morgan"
import { HTTPS_CERT } from "./utils"
import API from "./service"
import { Bootstrap } from "./repository/Bootstrap"
import { ActivityScheduler, cleanAllQueues } from "./utils/ActivitySchedulerJob"

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
  await Bootstrap()

  // Establish the API router, as well as a few individual utility routes.
  app.use("/", API)
  app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
  app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))
  console.log("Server routing initialized.")

  // Begin running activity/automations scheduling AFTER connecting to the database.
  if (process.env.SCHEDULER === "on") {
    console.log("Clean all queues...")
    await cleanAllQueues()
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
