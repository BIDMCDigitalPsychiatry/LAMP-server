require("dotenv").config()
import https from "https"
import { HTTPS_CERT } from "./utils"
import { Bootstrap } from "./repository/Bootstrap"
import { ActivityScheduler, cleanAllQueues } from "./utils/queue/ActivitySchedulerJob"
import app from './app'

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")
  await Bootstrap()

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
main().then(console.log).catch(console.error)
