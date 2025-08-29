// -- { CRITICAL LOADING - START } --------------------------------------------
//
// Important: Ordering is important here. Sentry's node instrumentation portion
// should be the first thing to run in order to capture any errors that might
// occur loading our dependencies or wiring up the app.
// ----------------------------------------------------------------------------

import "./utils/sentry";

// ----------------------------------------------------------------------------
// Now we can proceed loading all the rest of the world...
//
// -- { CRITICAL LOADING - END } ----------------------------------------------


import http from "http";
import { Bootstrap } from "./repository/Bootstrap";
import app from "./app";

// ---------------------
// Shutdown Grace Period
//
// Definition: the time between when the server stops accepting new requests and
//   when in-flight requests are forcibly terminated.
//
// Default: 1s Note: In our ECS environments we set this as close as is
// reasonable to the ECS grace period (30s).
const SHUTDOWN_GRACEPERIOD_MS: number = parseInt(
  process.env.SHUTDOWN_GRACEPERIOD_MS || "1000"
);

const PORT: number = parseInt(process.env.PORT || "3000");

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

  const server = http.createServer(app)
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`)
  })

  async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} received`);
    console.log("Shutting down...");
    server.close((err) => {
      if (err) {
        console.error("Server was not open when 'close' was called", err);
        process.exit(1);
      } else {
        console.log("Server exited successfully.");
        process.exit(0);
      }
    });
    setTimeout(() => {
      console.info("Forcibly terminating long-lived, in-flight connections");
      server.closeAllConnections();
    }, SHUTDOWN_GRACEPERIOD_MS);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main()
  .then(() => console.log("Startup complete"))
  .catch(console.error)
