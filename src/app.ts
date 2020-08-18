require("dotenv").config()
import API from "./service"
import express, { Application } from "express"
import bodyParser from "body-parser"
import sql from "mssql"
import crypto from "crypto"
import http from "http"
import https from "https"
import _Docker from "dockerode"
import ScriptRunner from "./utils/ScriptRunner"
import { LegacyAPI } from "./utils/legacy/route"
import nano from "nano"
import cors from "cors"
import morgan from "morgan"
import AWS from "aws-sdk"
import { activityData } from "./repository/pouchRepository/Syncronisation"
import { dataSync } from "./repository/pouchRepository/Syncronisation"
import { promises } from "dns"
export const PouchDB = require("pouchdb")

// FIXME: Support application/json;indent=:spaces format mime type!

//
export const Docker = new _Docker({ host: "localhost", port: 2375 })

//
export const Database = nano(process.env.CDB ?? "")

export const MSSQL_USER = process.env.MSSQL_USER
export const MSSQL_PASS = process.env.MSSQL_PASS

//
export const AWSBucketName = process.env.S3_BUCKET ?? ""
export const S3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY ?? "",
  secretAccessKey: process.env.S3_ACCESS_KEY ?? "",
})

// Configure the base Express app and middleware.
export const app: Application = express()
app.set("json spaces", 2)
app.use(bodyParser.json({ limit: "50mb", strict: false }))
app.use(bodyParser.text())
app.use(cors())
app.use(morgan(":method :url :status - :response-time ms"))
app.use(express.urlencoded({ extended: true }))

//
const _server =
  process.env.HTTPS === "off"
    ? app
    : https.createServer(
        {
          passphrase: "localhost",
          key: `-----BEGIN ENCRYPTED PRIVATE KEY-----
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
6CMlq+Yko7ZnovATOHp44BrCmg==
-----END ENCRYPTED PRIVATE KEY-----`,
          cert: `-----BEGIN CERTIFICATE-----
MIIFrjCCA5YCCQD+q//Qt55eFTANBgkqhkiG9w0BAQsFADCBlzELMAkGA1UEBhMC
VVMxCzAJBgNVBAgMAk1BMQ8wDQYDVQQHDAZCb3N0b24xLTArBgNVBAoMJEJldGgg
SXNyYWVsIERlYWNvbmVzcyBNZWRpY2FsIENlbnRlcjEnMCUGA1UECwweRGl2aXNp
b24gb2YgRGlnaXRhbCBQc3ljaGlhdHJ5MRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcN
MjAwMTA1MDM0NTA0WhgPMjExOTEyMTIwMzQ1MDRaMIGXMQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCTUExDzANBgNVBAcMBkJvc3RvbjEtMCsGA1UECgwkQmV0aCBJc3Jh
ZWwgRGVhY29uZXNzIE1lZGljYWwgQ2VudGVyMScwJQYDVQQLDB5EaXZpc2lvbiBv
ZiBEaWdpdGFsIFBzeWNoaWF0cnkxEjAQBgNVBAMMCWxvY2FsaG9zdDCCAiIwDQYJ
KoZIhvcNAQEBBQADggIPADCCAgoCggIBALj096AYEwGbl6AXOrcssC4CN4v8YPlY
i59JOTBUyYm8f66wCxSLLMZ3HbrxtqvxpQl6nMNQsofxcWBiwDiNjWtI33Yyci8M
9w1zYT3CmS4+8tn+LS47e2KodHdRZX39TzcqxRxQrwT7oc9XeNE7nwjX6dMQG1Db
ebDAsPcaINRo0nwGMlDdNWwRqvWXTtVjq2l4ORlhgzx604Squ0SBjiZFNNdJeXlG
MoAxeq4NEMlWIi0XHD43wMAHjA82WQ23T0NLFMQJGBJkeV6Y4D53M3nLZk/6kbw6
Rk7WbiYOgL+Bv1oNF2IPNR/NI2248+feltJRehTQKeCPXblMM9k/CvV+s63LiEc/
Rn4KyQ+oS6rS9WY8G8hZ0lXp9nlsTUUS0PfcioGyQ9r5gkEHDVkbPFEvU9q8wy/b
ueBM1akTkF89dXb4O0zrBWQJ79Fv7pxHdhNWto+OWUw0ARrJWTy2kysTqyZOlU2p
iv87enMMxCHPpgVkzIIwhzZC2b2JZ9htpyt6em/j6sSRBuBTffdOtzwHln0uRyRg
lK0cOC2O3ZKeuBDYIYEcT2ecqfngApRuzmnDcJ/511O2t6tTkViGvrjNwpon2tdd
lODK6gWZF0aD0dNojtXgcle3txsPFStT6vtRLVzb9Gyh/wr+6KZ/q8WCDNY41QAR
l0+4pmZ9qHynAgMBAAEwDQYJKoZIhvcNAQELBQADggIBAE1jv8jp2pC7mb07Fwiq
XFI2AUhzxiGuk/HH+7uNca0lvXfgVFF9jKnUnN6lR/Z2FQHZo/b9p8xZOuEkPgPc
fEJniJgFY9cZUvouEEd7+ljTgdOe3Mf6YYLAR0tT0NSxiSN7rCBbarVp10ULyoBV
itENnpQdbohx57TDdfCR3IfKbyAvFMto6Mrzj3PTMjGWEfyEkFVZhj+B2eKq6rol
G4Lskb+RD0rfQTqV4UY/D9ArQxklxzxt4JlID17gIb1NULfYl6GLQqinVZNki0nT
c9bPTwEyfILzjxI2clF8ZR3NvLDLz2bmbdHWXFsAAKA14Pqhd9EVX7pzsXXG1mBe
Fb7ZIjp4qQchetgKx7wTh5uR9Eo2/AZFI0gnADn9wBzLG3Y4WmTaeBLerur8fdSA
fgd43mHp6Q4taQ3Mm2+9K5E7EQL06BP2OWF2fRm2G8bQ9XJgV0q8kpc96ZblgGuy
0cOVOblm66Y4uPg/DV96U0sYWkZuLzkKP7MIKCqI5UEZvQ0QySMsYpku6i6hgtKI
bUFnraLvMJAzLQNN7BrrbdFTot7viPmZYe1Y12unlZ+yqHtusO5AdLF7p0F/t5k/
R/mQB9d2LJUy81BZrO05VHrz91sHSDRRPg4lDw2GVSFtUE1ILDc3usb7JwJYZIXT
fARYG40rIsYJipV76ICGNXSp
-----END CERTIFICATE-----`,
        },
        app
      )

/**
 *
 */
export let SQL: sql.ConnectionPool | undefined

/**
 *
 */
export const Root = { id: "root", password: process.env.ROOT_PASSWORD || "" }

/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
export const Encrypt = (data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined => {
  try {
    if (mode === "Rijndael") {
      const cipher = crypto.createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "utf8", "base64") + cipher.final("base64")
    } else if (mode === "AES256") {
      const ivl = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl)
      return Buffer.concat([ivl, cipher.update(Buffer.from(data, "utf16le")), cipher.final()]).toString("base64")
    }
  } catch {}
  return undefined
}

/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */
export const Decrypt = (data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined => {
  try {
    if (mode === "Rijndael") {
      const cipher = crypto.createDecipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "base64", "utf8") + cipher.final("utf8")
    } else if (mode === "AES256") {
      const dat = Buffer.from(data, "base64")
      const cipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ROOT_KEY || "", "hex"),
        dat.slice(0, 16)
      )
      return Buffer.concat([cipher.update(dat.slice(16)), cipher.final()]).toString("utf16le")
    }
  } catch {}
  return undefined
}

/**
 *
 */
export const Download = function (url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http
    const request = lib.get(url, (response) => {
      if ((response.statusCode || 0) < 200 || (response.statusCode || 0) > 299)
        reject(new Error("" + response.statusCode))
      const body: Buffer[] = []
      response.on("data", (chunk) => body.push(Buffer.from(chunk)))
      response.on("end", () => resolve(Buffer.concat(body)))
    })
    request.on("error", (err) => reject(err))
  })
}
/*Middleware for version check
 *@param req OBJECT
 *@param res OBJECT
 *@param next FUNCTION
 */
function VersionCheck(req: any, res: any, next: any) {
  try {
    const sharedKey = process.env.ROOT_KEY
    const device_id = req.get("device_id")
    // const test= crypto.createHash('md5').update("123").digest("hex");
    const computedSignature = crypto.createHmac("sha256", `${sharedKey}`).update(device_id).digest("hex")
    const token = req.get("Authorization")?.split(" ")[1]
    if (computedSignature === token) {
      next()
    } else {
      res.status(404).json({})
    }
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
}
// Initialize and configure the application.
async function main() {
  const _openAPIschema = {
    ...(await Database.use("root").get("#schema")),
    _id: undefined,
    _rev: undefined,
  }

  // Establish the API routes.
  app.use("/", API)
  app.use("/v0", LegacyAPI)

  /*check whether activity data exists for the participant. sync data, if not exists
   *
   */
  app.get("/getuser/:participant_id", async (req, res) => {
    let participant_id = req.params.participant_id
    const activity = await activityData(participant_id)
    if (!activity) {
      dataSync(participant_id)
    }
    res.json(true)
  })

  // TEST
  app.get("/getalldoc", async (req, res) => {
    try {
      console.log("apigetalldoc")

      const db = new PouchDB("credential")
      const result: any = await db.allDocs({
        include_docs: true,
        attachments: true,
      })
      // tslint:disable-next-line:no-console
      console.log(result)
      res.json(result)
    } catch (err) {
      res.status(404).json({ error: err.message })
    }
  })

  /*Check for version and returns the download url for input version
   *
   *
   */
  app.get("/version/get/:ver", VersionCheck, async (req, res, next) => {
    let inputVersion: string | undefined = req.params.ver
    console.log(inputVersion)
    try {
      const Version: [] = (
        await Database.use("version").find({
          selector: { version: inputVersion === undefined ? (undefined as any) : { $eq: inputVersion } },
          fields: ["version", "url"],
          sort: [
            {
              version: "desc",
            },
          ],
        })
      ).docs.map((x: any) => ({
        ...x,
        version: x.version,
        url: x.url,
      })) as any
      res.json(Version)
    } catch (err) {
      res.status(404).json({ error: err.message })
    }
  })

  /*Check for latest version and returns the download url for latest
   *
   *
   */
  app.get("/version/get", VersionCheck, async (req, res, next) => {
    try {
      const Version = (
        await Database.use("version").find({
          selector: {},
          fields: ["version", "url"],
          sort: [
            {
              version: "desc",
            },
          ],
        })
      ).docs[0]
      res.json(Version)
    } catch (err) {
      res.status(404).json({ error: err.message })
    }
  })

  // Establish misc. routes.
  app.get("/", async (req, res) => res.json(_openAPIschema))
  app.get("/favicon.ico", (req, res) => res.status(204))
  app.get("/service-worker.js", (req, res) => res.status(204))
  app.get("/_utils", (req, res) => {
    if (req.query.key !== Root.password) return res.status(400).json({ message: "invalid credentials" })
    if (req.query.func === "crypto")
      return res.status(200).json((req.query.type === "encrypt" ? Encrypt : Decrypt)(req.query.data, req.query.mode))
    return res.status(400).json({ message: "invalid utility function" })
  })
  app.all("*", (req, res) => res.status(404).json({ message: "404.api-endpoint-unimplemented" }))

  // Establish the SQL connection.
  SQL = await new sql.ConnectionPool({
    user: MSSQL_USER,
    password: MSSQL_PASS,
    server: "moplmssql.c2engehb1emz.ap-south-1.rds.amazonaws.com",
    port: 56732,
    database: "LAMP_V2",
    parseJSON: true,
    stream: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    options: {
      encrypt: true,
      appName: "LAMP-legacy",
      abortTransactionOnError: true,
      // enableArithAbort:false
    },
    pool: {
      min: 1,
      max: 100,
      idleTimeoutMillis: 30000,
    },
  }).connect()
  // tslint:disable-next-line:no-console
  console.log(`Lamp server running in ${process.env.PORT}`)
  // Begin listener on port 3000.
  _server.listen(process.env.PORT || 3000)
}

// GO!
main()
