import Nano, { ServerScope } from "nano"
import {
  Setup,
  Changes,
  Researcher,
  Study,
  Participant,
  Activity,
  ActivityEvent,
  SensorEvent,
  Credential
} from "./migrators"

const nano = Nano(process.env.CDB_PARAM || "") as ServerScope
const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))

export default async function migrator() {
  let availableDBs = await nano.db.list()

  function existsDB(name: string) {
    return availableDBs.indexOf(name) >= 0
  }
  async function updateToken(token?: any) {
    token = token || {} // TODO: set to await Changes()
    let renewedToken = await nano.use("root").insert({ ...token, _id: "sync_token" } as any)
    console.dir(renewedToken)
    return renewedToken
  }
  async function createDB(name: string, documents?: () => Promise<any[]>) {
    console.group()
    console.time()
    console.log(`-- STARTING [${name}] --`)
    console.dir(await nano.db.create(name))
    if (!!documents) {
      console.dir(
        await nano.use(name).bulk({
          docs: await documents()
        })
      )
    } else console.dir({ ok: true, message: "no documents to create" })
    console.log(`-- FINISHED [${name}] --`)
    if (name !== "root") {
      console.log(`-- CREATING BIDI SYNC TOKEN [${name}] --`)
      let token = (await nano.use("root").get("sync_token")) as any
      token.cdb = { ...(token.cdb || {}), [name]: (await nano.db.changes(name, { since: "now" } as any)).last_seq }
      token.sql = { ...(token.sql || {}), [name]: await Changes() }
      console.dir(token)
      await updateToken(token)
      console.log("-- CREATED LATEST SYNC TOKEN --")
    }
    console.timeEnd()
    console.groupEnd()
    availableDBs = await nano.db.list()
  }
  async function biDiSyncUnit(
    name: string,
    backward: (change_version: string) => Promise<string>,
    forward: (change_version: string) => Promise<string>
  ) {
    console.group()
    console.time()
    let token = (await nano.use("root").get("sync_token")) as any
    let token_bak = JSON.parse(JSON.stringify(token)) /* deep clone */
    console.log(`-- STARTING BACKWARD FLUSH [${name}] --`)
    console.group()
    token.cdb[name] = await backward(token.cdb[name] || "now")
    console.groupEnd()
    console.log(`-- FINISHED BACKWARD FLUSH [${name}] --`)
    console.log(`-- STARTING FORWARD SYNC [${name}] --`)
    console.group()
    token.sql[name] = await forward(token.sql[name] || "0")
    console.groupEnd()
    console.log(`-- FINISHED FORWARD SYNC [${name}] --`)
    if (token.cdb[name] !== token_bak.cdb[name] || token.sql[name] !== token_bak.sql[name]) await updateToken(token)
    else console.log("-- NO SYNC TOKEN CHANGE DETECTED --")
    console.timeEnd()
    console.groupEnd()
  }
  async function oneWaySync() {
    console.log("-- STARTING ONEWAY SYNC --")
    if (!existsDB("root")) {
      await createDB("root")
      await updateToken()
    }
    if (!existsDB("researcher")) await createDB("researcher", async () => await Researcher._select())
    if (!existsDB("participant")) await createDB("participant", async () => await Participant._select())
    if (!existsDB("activity")) await createDB("activity", async () => await Activity._select())
    if (!existsDB("activity_event")) await createDB("activity_event", async () => await ActivityEvent._select())
    if (!existsDB("sensor_event")) await createDB("sensor_event", async () => await SensorEvent._select())
    console.log("-- FINISHED ONEWAY SYNC --")
  }
  async function biDiSync() {
    console.log("-- STARTING BIDI SYNC --")
    if (existsDB("researcher")) {
      await biDiSyncUnit(
        "researcher",
        async change_version => {
          let changes = await nano.db.changes("researcher", { since: change_version, include_docs: true } as any)
          console.dir({ changes: changes.results.map(x => ({ id: x.id, seq: x.seq })) })
          if (changes.results.length === 0) return changes.last_seq
          let results = changes.results.map(x => (x as any).doc)

          //
          let reconcilations = await Researcher._upsert(results)
          console.dir(reconcilations)
          console.dir(
            await nano.use("researcher").bulk({
              docs: results
                .map(x => ({ ...x, $_rec: reconcilations.find(y => y.SourceID === x._id && y.Action === "INSERT") }))
                .filter(x => !!x.$_rec)
                .map(x => ({ ...x, $_rec: undefined, $_sync_id: x.$_rec.TargetID }))
            })
          )
          return (await nano.db.changes("researcher", { since: "now" } as any)).last_seq
        },
        async change_version => {
          console.dir(
            await nano.use("researcher").bulk({
              docs: await Researcher._select(change_version)
            })
          )
          return await Changes()
        }
      )
    }
    if (existsDB("participant")) {
      await biDiSyncUnit(
        "participant",
        async change_version => {
          let changes = await nano.db.changes("participant", { since: change_version } as any)

          /* insert */

          /* update */

          /* delete */

          return changes.last_seq
        },
        async change_version => {
          console.dir(
            await nano.use("participant").bulk({
              docs: await Participant._select(change_version)
            })
          )
          return await Changes()
        }
      )
    }
    if (existsDB("activity")) {
      await biDiSyncUnit(
        "activity",
        async change_version => {
          let changes = await nano.db.changes("activity", { since: change_version } as any)

          /* insert */

          /* update */

          /* delete */

          return changes.last_seq
        },
        async change_version => {
          console.dir(
            await nano.use("activity").bulk({
              docs: await Activity._select(change_version)
            })
          )
          return await Changes()
        }
      )
    }
    if (existsDB("activity_event")) {
      await biDiSyncUnit(
        "activity_event",
        async change_version => {
          // NOTE: Does not handle INSERT, UPDATE, or DELETE operations.
          return change_version
        },
        async change_version => {
          // NOTE: Does not handle UPDATE or DELETE operations.
          console.dir(
            await nano.use("activity_event").bulk({
              docs: await ActivityEvent._select(change_version)
            })
          )
          return await Changes()
        }
      )
    }
    if (existsDB("sensor_event")) {
      await biDiSyncUnit(
        "sensor_event",
        async change_version => {
          // NOTE: Does not handle INSERT, UPDATE or DELETE operations.
          return change_version
        },
        async change_version => {
          // NOTE: Does not handle UPDATE or DELETE operations.
          console.dir(
            await nano.use("sensor_event").bulk({
              docs: await SensorEvent._select(change_version)
            })
          )
          return await Changes()
        }
      )
    }
    console.log("-- FINISHED BIDI SYNC --")
  }

  console.log("-- INITIALIZING --")
  await oneWaySync()
  while (true) {
    try {
      await biDiSync()
    } catch (error) {
      console.dir({ error })
    }
    console.log("-- COOLDOWN PAUSE --")
    await sleep(10 * 1000)
  }

  /*
	console.dir(await Participant._upsert([
		{
			_id: 'a',
			$_sync_id: 10006,
			$_parent_id: 1,
			_deleted: true,
		}, {
			_id: 'b',
			$_sync_id: 10007,
			$_parent_id: 1,
			_deleted: true,
		}, {
			_id: 'c',
			$_sync_id: 10008,
			$_parent_id: 5,
			_deleted: false,
		}, {
			_id: 'd',
			$_sync_id: 10009,
			$_parent_id: 24,
			_deleted: false,
		}, {
			_id: 'z',
			$_sync_id: 10015,
			$_parent_id: 1,
			_deleted: false,
		}, {
			_id: 'f',
			$_sync_id: 10011,
			$_parent_id: 1,
			_deleted: true,
		}, {
			_id: 'g',
			$_sync_id: 10012,
			$_parent_id: 1,
			_deleted: false,
		}, {
			_id: 'h',
			$_sync_id: 10013,
			$_parent_id: 14,
			_deleted: false,
		}, {
			_id: 'i',
			$_sync_id: 10014,
			$_parent_id: 1,
			_deleted: false,
		}
	]))*/
}

// ActivityEvent + SensorEvent:
// 	 - Does not replicate UPDATE/DELETE operations from SQL.
//   - SensorEvent -> watch UserDevices.*/AppVersion/LastLogin here
//	 - attachments for UserSettings.* -> ???

// activity:
// schedule, settings, deletion, parent
// Admin_Settings.ReminderClearInterval
// if settings value contains a known key, update it, otherwise bail
// if spec is a known value, create new activity, otherwise bail

// TODO: Credential tracking
