import { PouchDB } from "../../app"
import { v4 as uuidv4 } from "uuid"
import * as jwt from "jsonwebtoken"
const CDB_REVPROXY_URL = process.env.CDB_REVPROXY_URL
const JWT_SECRET = process.env.JWT_SECRET
let syncCompStatus = false

//Replication/Sync event handling
const onSyncError = () => {
  // tslint:disable-next-line:no-console
  console.log("error")
}
const onSyncChange = () => {
  if (!syncCompStatus) {
    // tslint:disable-next-line:no-console
    console.log(".....wait for completion")
  }
}
const onSyncPaused = () => {
  if (!syncCompStatus) {
    // tslint:disable-next-line:no-console
    console.log("...wait for completion")
  }
}

/* generate JWT token based on userid
 *
 */
const generateToken = async (userId: string) => {
  let payload = {
    userId: userId,
  }
  let token = jwt.sign(payload, `${JWT_SECRET}`, { expiresIn: "1h" })
  return token
}

/* sync user data bidirectional
 *
 */
const biSync = async (db: string, userId: string, identifier: string) => {
  try {
    let deviceId = `${userId}${uuidv4()}`
    let token = await generateToken(deviceId)
    const local = new PouchDB(db)
    const remote = new PouchDB(`${CDB_REVPROXY_URL}/${db}/`, {
      fetch: function (url: any, opts: any) {
        opts.headers.set("authorization", `Basic ${token}`)
        opts.headers.set("userid", deviceId)
        opts.headers.set("source", "web")
        opts.headers.set("user-agent", "")
        opts.headers.set("host", "")
        return PouchDB.fetch(url, opts)
      },
    })

    let opts = {}
    if (identifier === "_id") {
      opts = {
        live: true,
        retry: true,
        filter: "userfilter/by_user",
        query_params: { _id: userId },
      }
    } else if (identifier === "origin") {
      opts = {
        live: true,
        retry: true,
        filter: "userfilter/by_user",
        query_params: { origin: userId },
      }
    } else if (identifier === "#parent") {
      opts = {
        live: true,
        retry: true,
        filter: "userfilter/by_user",
        query_params: { parent: userId },
      }
    }
    const repl: any = await remote.replicate
      .to(local, {
        filter: "userfilter/by_user",
        query_params: { parent: userId },
      })
      .on("complete", () => {
        // tslint:disable-next-line:no-console
        console.log(`${db} replication from and to local.`)
        if (db == "activity_event" || db == "sensor_event") {
          indexCreate(db)
        }
        local.sync(remote, opts).on("change", onSyncChange).on("paused", onSyncPaused).on("error", onSyncError)
        if (db == "sensor_event") {
          console.log(`Syncronisation Completed!`)
          syncCompStatus = true
        }
      })
      .on("error", () => {
        // tslint:disable-next-line:no-console
        console.log("ERROR ON COMPLETE")
      })

    return repl
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log(error)
  }
}

/* sync user data from remote db
 *
 */
const replicateFrom = async (db: string) => {
  try {
    const local = new PouchDB(db)
    const remote = new PouchDB(`${CDB_REVPROXY_URL}/${db}/`)

    const repl: any = await remote.replicate
      .to(local)
      .on("complete", () => {
        // tslint:disable-next-line:no-console
        console.log(`${db} replication to local, pls wait.`)
      })
      .on("change", onSyncChange)

    return repl
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log(error)
  }
}

/*Create appropriate indexing for pouch db
 *
 */
export const indexCreate = async (dbAct: string) => {
  PouchDB.plugin(require("pouchdb-find"))
  let db = new PouchDB("sensor_event")
  try {
    if (dbAct === "activity_event") {
      // tslint:disable-next-line:no-console
      console.log("activity_event indexed")
      db = new PouchDB(dbAct)
      await db.createIndex({
        index: {
          fields: ["activity"],
        },
      })
      await db.createIndex({
        index: {
          fields: ["#parent"],
        },
      })
      await db.createIndex({
        index: {
          fields: ["timestamp"],
        },
      })
    } else {
      // tslint:disable-next-line:no-console
      console.log("sensor_event indexed")
      db = new PouchDB("sensor_event")
      await db.createIndex({
        index: {
          fields: ["origin"],
        },
      })
      await db.createIndex({
        index: {
          fields: ["#parent"],
        },
      })
      await db.createIndex({
        index: {
          fields: ["timestamp"],
        },
      })
    }
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.log(err)
  }
}

/* Sync between database, while handling API
 *
 */
export const sync = async (from: string, to: string) => {
  try {
    const local = new PouchDB(from)
    const remote = new PouchDB(`${CDB_REVPROXY_URL}/${to}/`)
    const repl: any = await local.replicate
      .to(remote, {
        live: true,
        retry: true,
      })
      .on("complete", () => {
        // tslint:disable-next-line:no-console
        console.log("synced on api")
      })

    return repl
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log(error)
    return error
  }
}

/* get user data from local db
 *
 */
export const activityData = async (userId: string) => {
  let status: any = false
  try {
    const db = new PouchDB("activity_event")
    const result: any = await db.allDocs({
      include_docs: true,
      attachments: true,
    })
    if (result.total_rows > 0) {
      //tslint:disable-next-line:no-console
      console.log("There is local data")
      status = true
    }
  } catch (error) {
    //tslint:disable-next-line:no-console
    console.log(error)
  }
  return status
}

/* data sync from remote, if no local data exists
 *
 */
export const dataSync = async (userId: string) => {
  //tslint:disable-next-line:no-console
  console.log("no_data")
  try {
    //tslint:disable-next-line:no-console
    console.log("starting syncronisation")
    replicateFrom("activity")
    replicateFrom("activity_spec")
    replicateFrom("migrator_link")
    replicateFrom("researcher")
    replicateFrom("sensor")
    replicateFrom("sensor_spec")
    replicateFrom("root")
    replicateFrom("study")
    replicateFrom("tags")

    biSync("activity_event", userId, "#parent")
    biSync("sensor_event", userId, "#parent")
    biSync("credential", userId, "origin")
    biSync("participant", userId, "_id")
  } catch (error) {
    //tslint:disable-next-line:no-console
    console.log(error)
  }
}
