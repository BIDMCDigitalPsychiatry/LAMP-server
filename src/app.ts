import express, { Application } from "express"
import cors from "cors"
import morgan from "morgan"
import API from "./service"
import { applySentryForExpress } from "./utils/sentry"
import { auth } from "./utils/auth"
import { toNodeHandler } from "better-auth/node"
import { authenticateSession } from "./middlewares/authenticateSession"

var cookieParser = require("cookie-parser")

const app: Application = express()

app.use(cookieParser())
app.use("/api/auth/*", toNodeHandler(auth))

app.set("json spaces", 2)
app.use(express.json({ limit: "50mb", strict: false }))
app.use(express.text())

const allowedOrigins = [
      "https://dashboard.dev.lamp.digital",
      "https://dashboard-staging.lamp.digital",
      "https://dashboard.lamp.digital",
      "https://lamp-dashboard.zcodemo.com",
      "https://lamp-secdash.zcodemo.com",
]
if (process.env.DASHBOARD_URL) {
  allowedOrigins.push(process.env.DASHBOARD_URL)
}
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Accept",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Origin",
      "Api-Key",
      "Attribution",
      "Content-Range",
      "Content-Type",
      "Geo-Token",
      "Origin",
      "Session-Key",
      "Timestamp",
      "X-Content-Range",
      "X-Forwarded-For",
      "X-Requested-With",
      "Device-Type",
      "App-Type",
      "authorization",
      "Cookie"
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Access-Control-Max-Age is 24 hours
  })
)
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))

app.get("/supported-auth-type", (req, res) => {res.json({authType: "session"})})

// Establish the API router, as well as a few individual utility routes.
app.use("/", API)
app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

applySentryForExpress(app)

export default app
