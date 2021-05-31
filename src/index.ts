//require("dotenv").config()
import https from "https"
import { HTTPS_CERT } from "./utils"
import { Bootstrap } from "./repository/Bootstrap"
import app from './app'

// NodeJS v15+ do not log unhandled promise rejections anymore.
process.on('unhandledRejection', error => { console.dir(error) })

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")
  await Bootstrap()
  console.log("Server routing initialized.")  
  console.groupEnd()
  console.log("Initialization complete.")

  // Begin listener on port 3000.
  const _server = process.env.HTTPS === "off" ? app : https.createServer(HTTPS_CERT, app)
  _server.listen(process.env.PORT || 3000)
}
main().then(console.log).catch(console.error)
