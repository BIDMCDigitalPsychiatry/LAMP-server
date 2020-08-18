require("dotenv").config()
import express from "express"
import { Router, Request, Response } from "express"
import cors from "cors"

const app = express()
const cdb = process.env.CDB

const API = Router()
app.set("json spaces", 2)
app.use(cors())
app.use(express.urlencoded({ extended: true }))
const _server = app

// initializing the proxy
let couchProxy = require("express-couch-proxy")
try {
  couchProxy = couchProxy({ realm: "CouchDB Replication" }, function (
    database: any,
    username: any,
    password: any,
    next: any
  ) {
    // tslint:disable-next-line:no-console
    console.log(database)
    // tslint:disable-next-line:no-console
    console.log(username)
    // tslint:disable-next-line:no-console
    console.log(password)

    const couchUrl = `http://${username}:${password}@${cdb}/${database}`

    // Need to implement authorization, if required --need suggestion
    if (username && database && password) {
      // syncing data to couch db instance
      return next(null, couchUrl)
    }

    return next(new Error("unauthorized"))
  })
} catch (error) {
  // tslint:disable-next-line:no-console
  console.log(error)
}

// calling the sync middleware
app.use("/sync", couchProxy)

// calling the sync middleware
//   app.use('/');
app.get("/", function (req, res) {
  // tslint:disable-next-line:no-console
  console.log(req.headers)
  return res.json(true)
})

try {
  _server.listen(process.env.port, () => {
    // tslint:disable-next-line:no-console
    console.log(`Lamp rev proxy server started at http://localhost:${process.env.port}`)
  })
} catch (error) {
  // tslint:disable-next-line:no-console
  console.log(error)
}
