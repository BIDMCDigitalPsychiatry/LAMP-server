import express, { Application } from "express"
import cors from "cors"
import morgan from "morgan"
import API from "./service"
import rateLimit from "express-rate-limit"
var cookieParser = require("cookie-parser")

const app: Application = express()
app.set("json spaces", 2)
app.use(express.json({ limit: "50mb", strict: false }))
app.use(express.text())

app.use(
  cors({
    origin: [
      "https://dashboard-staging.lamp.digital",
      "https://dashboard.lamp.digital",
      "https://lamp-dashboard.zcodemo.com",
      "https://lamp-secdash.zcodemo.com",
      "http://localhost:3000",
    ],
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
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Access-Control-Max-Age is 24 hours
    credentials: true,
  }),
)
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))
// app.use(cookieParser())

// Establish the API router, as well as a few individual utility routes.
app.use("/", API)
app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

export default app
