import express, { Application } from "express"
import cors from "cors"
import morgan from "morgan"
import API from "./service"
import { applySentry } from "./applySentry"

const app: Application = express()
app.set("json spaces", 2)
app.use(express.json({ limit: "50mb", strict: false }))
app.use(express.text())
app.use(cors())
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))

// Establish the API router, as well as a few individual utility routes.
app.use("/", API)
app.get(["/favicon.ico", "/service-worker.js"], (req, res) => res.status(204))
app.get("/debug-sentry-77be9c00-79f8-11f0-9595-1f183f5fde2a", function mainHandler(req: any, res: any) {
  throw new Error("Demo Sentry Error!");
});
app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

applySentry(app)

export default app