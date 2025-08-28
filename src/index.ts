import http from "http"
import { Bootstrap } from "./repository/Bootstrap"
import app from "./app"

// NodeJS v15+ do not log unhandled promise rejections anymore.
process.on("unhandledRejection", (error) => {
  console.dir(error)
})

// Initialize and configure the application.
async function main(): Promise<void> {
  console.group("Initializing LAMP API server...")
  await Bootstrap()
  console.log("Server routing initialized.")
  console.groupEnd()
  console.log("Initialization complete.")

  const PORT: number = parseInt(process.env.PORT || "3000");

  const server = http.createServer(app)
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`)
  })

  /**
   * Shuts down the server and exists the process.
   * NB: it does not ensure any clients are cleaned up correctly.
   */
  function shutdown() {
    console.info("LAMP shutting down")
    server.close(() => {
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

main()
  .then(() => console.log("Startup complete"))
  .catch(console.error)
