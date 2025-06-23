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

const limiter = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 500, // max requests per IP
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
})

//app.use(cors({ origin: "*", credentials: true }))
app.use(
  cors({
    origin: "*",
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
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Access-Control-Max-Age is 24 hours
  }),
  limiter
)
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))
// app.use(cookieParser())

// Establish the API router, as well as a few individual utility routes.
app.use("/", API)
app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

export default app
