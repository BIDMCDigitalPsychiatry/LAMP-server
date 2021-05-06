import nano from "nano"
import crypto from "crypto"
import { customAlphabet } from "nanoid"
import { connect, NatsConnectionOptions, Payload } from "ts-nats"
import { MongoClient, ObjectID } from "mongodb"
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
  TypeRepository,
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
  TypeRepository as TypeRepositoryMongo,
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
import ioredis from "ioredis"
import { initializeQueues } from "../utils/queue/Queue"
export let RedisClient: ioredis.Redis | undefined
export let MongoClientDB: any
//initialize driver for db
let DB_DRIVER = ""
//Identifying the Database driver -- IF the DB in env starts with mongodb://, create mongodb connection
//--ELSEIF the DB/CDB in env starts with http or https, create couch db connection
if (process.env.DB?.startsWith("mongodb://")) {
  DB_DRIVER = "mongodb"
} else if (process.env.DB?.startsWith("http") || process.env.DB?.startsWith("https")) {
  DB_DRIVER = "couchdb"
  console.log(`COUCHDB adapter in use `)
} else {
  if (process.env.CDB?.startsWith("http") || process.env.CDB?.startsWith("https")) {
    DB_DRIVER = "couchdb"
    console.log(`COUCHDB adapter in use `)
  } else {
    console.log(`Missing repository adapter.`)
  }
}

//IF the DB/CDB in env starts with http or https, create and export couch db connection
export const Database: any =
  process.env.DB?.startsWith("http") || process.env.DB?.startsWith("https")
    ? nano(process.env.DB ?? "")
    : process.env.CDB?.startsWith("http") || process.env.CDB?.startsWith("https")
    ? nano(process.env.CDB ?? "")
    : ""

export const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20)
export const numeric_uuid = (): string => `U${Math.random().toFixed(10).slice(2, 12)}`
//Initialize redis client for cacheing purpose

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
  if (typeof process.env.REDIS_HOST === "string") {
    initializeQueues()
    RedisClient = new ioredis(      
      parseInt(`${(process.env.REDIS_HOST as any).match(/([0-9]+)/g)?.[0]}`),
      process.env.REDIS_HOST.match(/\/\/([0-9a-zA-Z._]+)/g)?.[0]
    )
  }

  if (DB_DRIVER === "couchdb") {
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
  } else {
      
    //Connect to mongoDB
    const client = new MongoClient(`${process.env.DB}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    try {
      await client.connect()
    } catch (error) {
      console.dir(error)
    }
    // return new Promise((resolve, reject) => {
    try {
      console.group("Initializing database connection...")
      if (client.isConnected()) {
        const db = process.env.DB?.split("/").reverse()[0]?.split("?")[0]
        MongoClientDB = await client?.db(db)
      } else {
        console.log("Database connection failed.")
      }
    } catch (error) {
      console.log("Database connection failed.")
    }
    //  })
    if (!!MongoClientDB) {
      console.group(`MONGODB adapter in use`)
      const DBs = await MongoClientDB.listCollections().toArray()
      const dbs: string[] = []
      for (const db of DBs) {
        await dbs.push(db.name)
      }
        
      // Preparing Mongo Collections
      if (!dbs.includes("activity_spec")) {
        console.log("Initializing ActivitySpec database...")
        await MongoClientDB.createCollection("activity_spec")
        const database = await MongoClientDB.collection("activity_spec")
        await database.createIndex({ timestamp: 1 })
      }
      console.log("ActivitySpec database online.")
      if (!dbs.includes("sensor_spec")) {
        console.log("Initializing SensorSpec database...")
        await MongoClientDB.createCollection("sensor_spec")
        const database = await MongoClientDB.collection("sensor_spec")
        await database.createIndex({ timestamp: 1 })
      }
      console.log("SensorSpec database online.")
      if (!dbs.includes("researcher")) {
        console.log("Initializing Researcher database...")
        await MongoClientDB.createCollection("researcher")
        const database = MongoClientDB.collection("researcher")
        await database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })
        await database.createIndex({ _parent: 1, timestamp: 1 })
        await database.createIndex({ timestamp: 1 })
      }
      console.log("Researcher database online.")
      if (!dbs.includes("study")) {
        console.log("Initializing Study database...")
        await MongoClientDB.createCollection("study")
        const database = MongoClientDB.collection("study")
        await database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })
        await database.createIndex({ _parent: 1, timestamp: 1 })
        await database.createIndex({ timestamp: 1 })
      }

      console.log("Study database online.")
      if (!dbs.includes("participant")) {
        console.log("Initializing Participant database...")
        await MongoClientDB.createCollection("participant")
        const database = MongoClientDB.collection("participant")
        await database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })
        await database.createIndex({ _parent: 1, timestamp: 1 })
        await database.createIndex({ timestamp: 1 })
      }
      console.log("Participant database online.")
      if (!dbs.includes("activity")) {
        console.log("Initializing Activity database...")
        await MongoClientDB.createCollection("activity")
        const database = await MongoClientDB.collection("activity")
        await database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })
        await database.createIndex({ _parent: 1, timestamp: 1 })
        await database.createIndex({ timestamp: 1 })
        await database.createIndex({ _id: 1, timestamp: 1 })
      }
      console.log("Activity database online.")
      if (!dbs.includes("sensor")) {
        console.log("Initializing Sensor database...")
        await MongoClientDB.createCollection("sensor")
        const database = MongoClientDB.collection("sensor")
        await database.createIndex({ _id: 1, _parent: 1, timestamp: 1 })
        await database.createIndex({ _parent: 1, timestamp: 1 })
        await database.createIndex({ timestamp: 1 })
      }
      console.log("Sensor database online.")
      if (!dbs.includes("activity_event")) {
        console.log("Initializing ActivityEvent database...")
        await MongoClientDB.createCollection("activity_event")
        const database = MongoClientDB.collection("activity_event")
        await database.createIndex({ _parent: -1, activity: -1, timestamp: -1 })
        await database.createIndex({ _parent: -1, timestamp: -1 })
      }
      console.log("ActivityEvent database online.")
      if (!dbs.includes("sensor_event")) {
        console.log("Initializing SensorEvent database...")
        await MongoClientDB.createCollection("sensor_event")
        const database = MongoClientDB.collection("sensor_event")
        await database.createIndex({ _parent: -1, sensor: -1, timestamp: -1 })
        await database.createIndex({ _parent: -1, timestamp: -1 })
      }
      console.log("SensorEvent database online.")
      if (!dbs.includes("tag")) {
        console.log("Initializing Tag database...")
        await MongoClientDB.createCollection("tag")
        const database = MongoClientDB.collection("tag")
        await database.createIndex({ _parent: 1, type: 1, key: 1 })
      }
      console.log("Tag database online.")
      if (!dbs.includes("credential")) {
        console.log("Initializing Credential database...")
        await MongoClientDB.createCollection("credential")
        const database = MongoClientDB.collection("credential")
        await database.createIndex({ access_key: 1 })
        await database.createIndex({ origin: 1 })
        await database.createIndex({ origin: 1, access_key: 1 })
        
        console.dir(`An initial administrator password was generated and saved for this installation.`)
        try {
          // Create a new password and emit it to the console while saving it (to share it with the sysadmin).
          const p = crypto.randomBytes(32).toString("hex")
          console.table({ "Administrator Password": p })
          await database.insertOne({
            _id: new ObjectID(),
            origin: null,
            access_key: "admin",
            secret_key: Encrypt(p, "AES256"),
            description: "System Administrator Credential",
            _deleted: false,
          } as any)
        } catch (error) {
          console.log(error)
        }
      }
      console.log("Credential database online.")
      
      console.groupEnd()
      console.groupEnd()
      console.log("Database verification complete.")
    } else {
      console.groupEnd()
      console.log("Database verification failed.")
    }
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
    return DB_DRIVER === "couchdb" ? new ResearcherRepository() : new ResearcherRepositoryMongo()
  }
  //GET Study Repository
  public getStudyRepository(): StudyInterface {
    return DB_DRIVER === "couchdb" ? new StudyRepository() : new StudyRepositoryMongo()
  }
  //GET Participant Repository
  public getParticipantRepository(): ParticipantInterface {
    return DB_DRIVER === "couchdb" ? new ParticipantRepository() : new ParticipantRepositoryMongo()
  }
  //GET Activity Repository
  public getActivityRepository(): ActivityInterface {
    return DB_DRIVER === "couchdb" ? new ActivityRepository() : new ActivityRepositoryMongo()
  }
  //GET Activity Repository
  public getSensorRepository(): SensorInterface {
    return DB_DRIVER === "couchdb" ? new SensorRepository() : new SensorRepositoryMongo()
  }
  //GET ActivityEvent Repository
  public getActivityEventRepository(): ActivityEventInterface {
    return DB_DRIVER === "couchdb" ? new ActivityEventRepository() : new ActivityEventRepositoryMongo()
  }

  //GET SensorEvent Repository
  public getSensorEventRepository(): SensorEventInterface {
    return DB_DRIVER === "couchdb" ? new SensorEventRepository() : new SensorEventRepositoryMongo()
  }
  //GET ActivitySpec Repository
  public getActivitySpecRepository(): ActivitySpecInterface {
    return DB_DRIVER === "couchdb" ? new ActivitySpecRepository() : new ActivitySpecRepositoryMongo()
  }

  //GET SensorSpec Repository
  public getSensorSpecRepository(): SensorSpecInterface {
    return DB_DRIVER === "couchdb" ? new SensorSpecRepository() : new SensorSpecRepositoryMongo()
  }

  //GET Credential Repository
  public getCredentialRepository(): CredentialInterface {
    return DB_DRIVER === "couchdb" ? new CredentialRepository() : new CredentialRepositoryMongo()
  }

  //GET TypeRepository Repository
  public getTypeRepository(): TypeInterface {
    return DB_DRIVER === "couchdb" ? new TypeRepository() : new TypeRepositoryMongo()
  }
}
