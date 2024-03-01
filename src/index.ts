//require("dotenv").config()
import http from "http"
import https from "https"
import { HTTPS_CERT } from "./utils"
import { Bootstrap } from "./repository/Bootstrap"
import app from "./app"

// NodeJS v15+ do not log unhandled promise rejections anymore.
process.on("unhandledRejection", error => {
  console.dir(error)
})

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")
  await Bootstrap()
  console.log("Server routing initialized.")
  console.groupEnd()
  console.log("Initialization complete.")

  const port = process.env.PORT || 3000

  let _server: http.Server | https.Server
  if (process.env.HTTPS && process.env.HTTPS !== "off") {
    console.info("Starting HTTPS server on port ", port)
    console.warn("Server is using default HTTPS certificates. Don't do this.")
    _server = https.createServer(HTTPS_CERT, app)
  } else {
    console.info("Starting HTTP server on port ", port)
    _server = http.createServer(app)
  }
  _server.listen(port)

  /**
   * Shuts down the server and exists the process.
   * NB: it does not ensure any clients are cleaned up correctly.
   */
  function shutdown() {
    console.info("LAMP shutting down")
    _server.close(() => {
      console.info("LAMP shut down")
      process.exit(0)
    })
  }

  // Add shutdown hook for SIGTERM
  process.on("SIGTERM", () => {
    console.debug("SIGTERM received")
    shutdown()
  })

  // Add shutdown hook for SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    console.debug("SIGINT received")
    shutdown()
  })
}

main().then(() => console.log("Startup complete")).catch(console.error)
