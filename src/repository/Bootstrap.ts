import nano from "nano"
import crypto from "crypto"
import { customAlphabet } from "nanoid"
import { connect, NatsConnectionOptions, Payload } from "ts-nats"
import mongoose from "mongoose"
import {
  ResearcherRepository,
  StudyRepository,
  ParticipantRepository,
  ActivityRepository,
  SensorRepository,
  ActivityEventRepository,
  SensorEventRepository,
  ActivitySpecRepository,
  SensorSpecRepository,
  CredentialRepository,
  TypeRepository
} from "./couch"
import {
  ResearcherRepository as ResearcherRepositoryMongo,
  StudyRepository as StudyRepositoryMongo,
  ParticipantRepository as ParticipantRepositoryMongo,
  ActivityRepository as ActivityRepositoryMongo,
  SensorRepository as SensorRepositoryMongo,
  ActivityEventRepository as ActivityEventRepositoryMongo,
  SensorEventRepository as SensorEventRepositoryMongo,
  ActivitySpecRepository as ActivitySpecRepositoryMongo,
  SensorSpecRepository as SensorSpecRepositoryMongo,
  CredentialRepository as CredentialRepositoryMongo,
  TypeRepository as TypeRepositoryMongo
} from "./mongo"
import {
  ResearcherInterface,
  StudyInterface,
  ParticipantInterface,
  ActivityInterface,
  SensorInterface,
  ActivityEventInterface,
  SensorEventInterface,
  ActivitySpecInterface,
  SensorSpecInterface,
  CredentialInterface,
  TypeInterface,
} from "./interface/RepositoryInterface"

export const Database: any = process.env.DB_DRIVER === "couchdb" ? nano(process.env.CDB ?? "") : ""
try {
  //MongoDB connection
  process.env.DB_DRIVER === "mongodb"
    ? mongoose
        .connect(`${process.env.MDB}`, { useUnifiedTopology: true, useNewUrlParser: true, dbName: "LampV2" } ?? "")
        .then(() => {
          console.log(`connected to MONGODB`)
          try {
          } catch (error) {
            console.log(`error`, error)
          }
        })
    : ""
} catch (error) {
  console.log(`No Mongo DB Connection`)
}
export const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20)
export const numeric_uuid = (): string => `U${Math.random().toFixed(10).slice(2, 12)}`

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

// Initialize the CouchDB databases if any of them do not exist.
export async function Bootstrap(): Promise<void> {
  if (process.env.DB_DRIVER === "couchdb") {
    console.group("Initializing database connection...")
    const _db_list = await Database.db.list()
    if (!_db_list.includes("activity_spec")) {
      console.log("Initializing ActivitySpec database...")
      await Database.db.create("activity_spec")
    }
    console.log("ActivitySpec database online.")
    if (!_db_list.includes("sensor_spec")) {
      console.log("Initializing SensorSpec database...")
      await Database.db.create("sensor_spec")
    }
    console.log("SensorSpec database online.")
    if (!_db_list.includes("researcher")) {
      console.log("Initializing Researcher database...")
      await Database.db.create("researcher")
      Database.use("researcher").bulk({
        docs: [
          {
            _id: "_design/timestamp-index",
            language: "query",
            views: {
              timestamp: {
                map: {
                  fields: {
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-parent-timestamp-index",
            language: "query",
            views: {
              "id-parent-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "#parent", "timestamp"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Researcher database online.")
    if (!_db_list.includes("study")) {
      console.log("Initializing Study database...")
      await Database.db.create("study")
      Database.use("study").bulk({
        docs: [
          {
            _id: "_design/timestamp-index",
            language: "query",
            views: {
              timestamp: {
                map: {
                  fields: {
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-parent-timestamp-index",
            language: "query",
            views: {
              "id-parent-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "#parent", "timestamp"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Study database online.")
    if (!_db_list.includes("participant")) {
      console.log("Initializing Participant database...")
      await Database.db.create("participant")
      Database.use("participant").bulk({
        docs: [
          {
            _id: "_design/timestamp-index",
            language: "query",
            views: {
              timestamp: {
                map: {
                  fields: {
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-parent-timestamp-index",
            language: "query",
            views: {
              "id-parent-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "#parent", "timestamp"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Participant database online.")
    if (!_db_list.includes("activity")) {
      console.log("Initializing Activity database...")
      await Database.db.create("activity")
      Database.use("activity").bulk({
        docs: [
          {
            _id: "_design/timestamp-index",
            language: "query",
            views: {
              timestamp: {
                map: {
                  fields: {
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-parent-timestamp-index",
            language: "query",
            views: {
              "id-parent-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-timestamp-index",
            language: "query",
            views: {
              "id-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "timestamp"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Activity database online.")
    if (!_db_list.includes("sensor")) {
      console.log("Initializing Sensor database...")
      await Database.db.create("sensor")
      Database.use("sensor").bulk({
        docs: [
          {
            _id: "_design/timestamp-index",
            language: "query",
            views: {
              timestamp: {
                map: {
                  fields: {
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "timestamp"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/id-parent-timestamp-index",
            language: "query",
            views: {
              "id-parent-timestamp": {
                map: {
                  fields: {
                    _id: "asc",
                    "#parent": "asc",
                    timestamp: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["_id", "#parent", "timestamp"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Sensor database online.")
    if (!_db_list.includes("activity_event")) {
      console.log("Initializing ActivityEvent database...")
      await Database.db.create("activity_event")
      Database.use("activity_event").bulk({
        docs: [
          {
            _id: "_design/parent-activity-timestamp-index",
            language: "query",
            views: {
              "parent-activity-timestamp": {
                map: {
                  fields: {
                    "#parent": "desc",
                    activity: "desc",
                    timestamp: "desc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: [
                      {
                        "#parent": "desc",
                      },
                      {
                        activity: "desc",
                      },
                      {
                        timestamp: "desc",
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "desc",
                    timestamp: "desc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: [
                      {
                        "#parent": "desc",
                      },
                      {
                        timestamp: "desc",
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("ActivityEvent database online.")
    if (!_db_list.includes("sensor_event")) {
      console.log("Initializing SensorEvent database...")
      await Database.db.create("sensor_event")
      Database.use("sensor_event").bulk({
        docs: [
          {
            _id: "_design/parent-sensor-timestamp-index",
            language: "query",
            views: {
              "parent-sensor-timestamp": {
                map: {
                  fields: {
                    "#parent": "desc",
                    sensor: "desc",
                    timestamp: "desc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: [
                      {
                        "#parent": "desc",
                      },
                      {
                        sensor: "desc",
                      },
                      {
                        timestamp: "desc",
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            _id: "_design/parent-timestamp-index",
            language: "query",
            views: {
              "parent-timestamp": {
                map: {
                  fields: {
                    "#parent": "desc",
                    timestamp: "desc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: [
                      {
                        "#parent": "desc",
                      },
                      {
                        timestamp: "desc",
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("SensorEvent database online.")
    if (!_db_list.includes("credential")) {
      console.log("Initializing Credential database...")
      await Database.db.create("credential")
      Database.use("credential").bulk({
        docs: [
          {
            _id: "_design/access_key-index",
            language: "query",
            views: {
              access_key: {
                map: {
                  fields: {
                    access_key: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["access_key"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/origin-index",
            language: "query",
            views: {
              origin: {
                map: {
                  fields: {
                    origin: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["origin"],
                  },
                },
              },
            },
          },
          {
            _id: "_design/origin-access_key-index",
            language: "query",
            views: {
              "origin-access_key": {
                map: {
                  fields: {
                    origin: "asc",
                    access_key: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["origin", "access_key"],
                  },
                },
              },
            },
          },
        ],
      })
      console.dir(`An initial administrator password was generated and saved for this installation.`)
      try {
        // Create a new password and emit it to the console while saving it (to share it with the sysadmin).
        const p = crypto.randomBytes(32).toString("hex")
        console.table({ "Administrator Password": p })
        await Database.use("credential").insert({
          origin: null,
          access_key: "admin",
          secret_key: Encrypt(p, "AES256"),
          description: "System Administrator Credential",
        } as any)
      } catch (e) {
        console.dir(e)
      }
    }
    console.log("Credential database online.")
    if (!_db_list.includes("tag")) {
      console.log("Initializing Tag database...")
      await Database.db.create("tag")
      Database.use("tag").bulk({
        docs: [
          {
            _id: "_design/parent-type-key-index",
            language: "query",
            views: {
              "parent-type-key": {
                map: {
                  fields: {
                    "#parent": "asc",
                    type: "asc",
                    key: "asc",
                  },
                  partial_filter_selector: {},
                },
                reduce: "_count",
                options: {
                  def: {
                    fields: ["#parent", "type", "key"],
                  },
                },
              },
            },
          },
        ],
      })
    }
    console.log("Tag database online.")
    console.groupEnd()
    console.log("Database verification complete.")
  }
}

//Initialize NATS connection for publisher and subscriber
export const nc = connect({
  servers: [`${process.env.NATS_SERVER}`],
  payload: Payload.JSON,
}).then((x) =>
  x.on("connect", (y) => {
    console.log("Connected to Nats Pub Server")
  })
)
export const ncSub = connect({
  servers: [`${process.env.NATS_SERVER}`],
  payload: Payload.JSON,
}).then((x) =>
  x.on("connect", (y) => {
    console.log("Connected to Nats Sub Server")
  })
)

//GET THE REPOSITORY TO USE(Mongo/Couch)
export class Repository {
  //GET Researcher Repository
  public getResearcherRepository(): ResearcherInterface {
    return process.env.DB_DRIVER === "couchdb" ? new ResearcherRepository() : new ResearcherRepositoryMongo()
  }
  //GET Study Repository
  public getStudyRepository(): StudyInterface {
    return process.env.DB_DRIVER === "couchdb" ? new StudyRepository() : new StudyRepositoryMongo()
  }
  //GET Participant Repository
  public getParticipantRepository(): ParticipantInterface {
    return process.env.DB_DRIVER === "couchdb" ? new ParticipantRepository() : new ParticipantRepositoryMongo()
  }
  //GET Activity Repository
  public getActivityRepository(): ActivityInterface {
    return process.env.DB_DRIVER === "couchdb" ? new ActivityRepository() : new ActivityRepositoryMongo()
  }
  //GET Activity Repository
  public getSensorRepository(): SensorInterface {
    return process.env.DB_DRIVER === "couchdb" ? new SensorRepository() : new SensorRepositoryMongo()
  }
  //GET ActivityEvent Repository
  public getActivityEventRepository(): ActivityEventInterface {
    return process.env.DB_DRIVER === "couchdb" ? new ActivityEventRepository() : new ActivityEventRepositoryMongo()
  }

  //GET SensorEvent Repository
  public getSensorEventRepository(): SensorEventInterface {
    return process.env.DB_DRIVER === "couchdb" ? new SensorEventRepository() : new SensorEventRepositoryMongo()
  }
  //GET ActivitySpec Repository
  public getActivitySpecRepository(): ActivitySpecInterface {
    return process.env.DB_DRIVER === "couchdb" ? new ActivitySpecRepository() : new ActivitySpecRepositoryMongo()
  }

  //GET SensorSpec Repository
  public getSensorSpecRepository(): SensorSpecInterface {
    return process.env.DB_DRIVER === "couchdb" ? new SensorSpecRepository() : new SensorSpecRepositoryMongo()
  }

  //GET Credential Repository
  public getCredentialRepository(): CredentialInterface {
    return process.env.DB_DRIVER === "couchdb" ? new CredentialRepository() : new CredentialRepositoryMongo()
  }

  //GET TypeRepository Repository
  public getTypeRepository(): TypeInterface {
    return process.env.DB_DRIVER === "couchdb" ? new TypeRepository() : new TypeRepositoryMongo()
  }
}
