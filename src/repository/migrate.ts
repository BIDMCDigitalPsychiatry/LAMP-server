import { Database, SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { SensorEvent, SensorName, LocationContext, SocialContext } from "../model/SensorEvent"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"

///
///
///

declare global {
  interface NumberConstructor {
    parse(input: string | number | undefined | null): number | undefined
  }
}

Object.defineProperty(Number, "parse", {
  value: function(input: string | number | undefined | null): number | undefined {
    if (input === null || input === undefined) return undefined
    if (typeof input === "number") return input
    return isNaN(Number(input)) ? undefined : Number(input)
  }
})

///
///
///

let _migrate_sensor_event_active_token = false
export async function _migrate_sensor_event() {
  if (_migrate_sensor_event_active_token) {
    return console.info("sensor_event migration aborted due to existing migrator activity")
  }
  _migrate_sensor_event_active_token = true
  try {
    let change_tracking = (await Database.use("root").get("#change_tracking")) as any
    let change_version: number = change_tracking.db.sensor_event
    if (change_version === undefined) {
      return console.info("sensor_event migration aborted due to missing change_version token")
    }
    let next_version = parseInt((await SQL!.query`SELECT CHANGE_TRACKING_CURRENT_VERSION()`).recordset[0][""])
    change_tracking.db.sensor_event = next_version
    if (next_version - change_version === 0) {
      return console.info("sensor_event migration aborted due to no tracked changes")
    }
    console.dir(`sensor_event migration from ${change_version ?? 0} to ${next_version ?? 0}`)

    let result1 = (
      await SQL!.request().query(`
        SELECT 
            timestamp, 
            type, 
            data, 
            X.StudyId AS [#parent]
        FROM (
            SELECT
                Users.AdminID, 
                Users.StudyId, 
                Users.IsDeleted,
                DATEDIFF_BIG(MS, '1970-01-01', U.CreatedOn) AS timestamp, 
                U.type,
                U.data
            FROM HealthKit_DailyValues
            UNPIVOT (data FOR type IN (
                Height, Weight, HeartRate, BloodPressure, 
                RespiratoryRate, Sleep, Steps, FlightClimbed, 
                Segment, Distance
            )) U
            LEFT JOIN Users
                ON U.UserID = Users.UserID
            WHERE U.data != ''
                AND HKDailyValueID IN (
                    SELECT C.HKDailyValueID
                    FROM CHANGETABLE(CHANGES HealthKit_DailyValues, ${change_version ?? "NULL"}) AS C 
                    WHERE SYS_CHANGE_CONTEXT IS NULL
                )
            UNION ALL 
            SELECT
                Users.AdminID, 
                Users.StudyId, 
                Users.IsDeleted,
                DATEDIFF_BIG(MS, '1970-01-01', DateTime) AS timestamp,
                REPLACE(HKParamName, ' ', '') AS type,
                Value AS data
            FROM HealthKit_ParamValues
            LEFT JOIN Users
                ON HealthKit_ParamValues.UserID = Users.UserID
            LEFT JOIN HealthKit_Parameters
                ON HealthKit_Parameters.HKParamID = HealthKit_ParamValues.HKParamID
            WHERE HKParamValueID IN (
                SELECT C.HKParamValueID
                FROM CHANGETABLE(CHANGES HealthKit_ParamValues, ${change_version ?? "NULL"}) AS C 
                WHERE SYS_CHANGE_CONTEXT IS NULL
            )
        ) X
	;`)
    ).recordset.map((raw: any) => {
      let obj = new SensorEvent()
      ;(<any>obj)["#parent"] = Decrypt(raw["#parent"])?.replace(/^G/, "")
      obj.timestamp = Number.parse(raw.timestamp) ?? 0
      obj.sensor = <SensorName>Object.entries(HK_LAMP_map).filter(x => x[1] === <string>raw.type)[0][0]
      obj.data = ((<any>HK_to_LAMP)[obj.sensor!] || ((x: any) => x))(raw.data)
      return obj
    })

    console.dir("[HealthKit_Values] migrating " + result1.length + " events")
    for (let i = 0; i < Math.ceil(result1.length / 30_000); i++) {
      let out = await Database.use("sensor_event").bulk({ docs: result1.slice(i * 30_000, (i + 1) * 30_000) })
      console.dir(out.filter(x => !!x.error))
    }

    let result2 = (
      await SQL!.request().query(`
	SELECT 
        DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) AS timestamp,
        Latitude AS lat,
        Longitude AS long,
        LocationName AS location_name,
        Users.StudyId AS [#parent]
    FROM Locations
    LEFT JOIN Users
        ON Locations.UserID = Users.UserID
    WHERE LocationID IN (
        SELECT C.LocationID
        FROM CHANGETABLE(CHANGES Locations, ${change_version ?? "NULL"}) AS C 
        WHERE SYS_CHANGE_CONTEXT IS NULL
    )
    ;`)
    ).recordset.map((raw: any) => {
      let x = toLAMP(raw.location_name)
      let obj = new SensorEvent()
      ;(<any>obj)["#parent"] = Decrypt(raw["#parent"])?.replace(/^G/, "")
      obj.timestamp = Number.parse(raw.timestamp) ?? 0
      obj.sensor = SensorName.ContextualLocation
      obj.data = {
        latitude: parseFloat(Decrypt(raw.lat) || raw.lat),
        longitude: parseFloat(Decrypt(raw.long) || raw.long),
        accuracy: -1,
        context: {
          environment: x[0] || null,
          social: x[1] || null
        }
      }
      return obj
    })

    console.dir("[Locations] migrating " + result2.length + " events")
    for (let i = 0; i < Math.ceil(result2.length / 30_000); i++) {
      let out = await Database.use("sensor_event").bulk({ docs: result2.slice(i * 30_000, (i + 1) * 30_000) })
      console.dir(out.filter(x => !!x.error))
    }

    /*let result3 = (
      await SQL!.request().query(`
			SELECT TOP ${limit}
				timestamp, sensor_name, data, Users.StudyId AS [#parent]
			FROM LAMP_Aux.dbo.CustomSensorEvent
            LEFT JOIN Users
            	ON CustomSensorEvent.UserID = Users.UserID
		;`)
    ).recordset.map((raw: any) => {
      let obj = new SensorEvent()
      ;(<any>obj)["#parent"] = Decrypt(raw["#parent"])?.replace(/^G/, "")
      obj.timestamp = raw.timestamp
      obj.sensor = raw.sensor_name
      obj.data = JSON.parse(raw.data)
      return obj
    })*/

    await Database.use("root").insert(change_tracking)
    console.dir("sensor_event migration completed")
  } catch (e) {
    console.error(e)
  } finally {
    _migrate_sensor_event_active_token = false
  }
}

/**
 *
 */
const toLAMP = (value?: string): [LocationContext?, SocialContext?] => {
  if (!value) return []
  let matches =
    (Decrypt(value) || value).toLowerCase().match(/(?:i am )([ \S\/]+)(alone|in [ \S\/]*|with [ \S\/]*)/) || []
  return [
    (<any>{
      home: LocationContext.Home,
      "at home": LocationContext.Home,
      "in school/class": LocationContext.School,
      "at work": LocationContext.Work,
      "in clinic/hospital": LocationContext.Hospital,
      outside: LocationContext.Outside,
      "shopping/dining": LocationContext.Shopping,
      "in bus/train/car": LocationContext.Transit
    })[(matches[1] || " ").slice(0, -1)],
    (<any>{
      alone: SocialContext.Alone,
      "with friends": SocialContext.Friends,
      "with family": SocialContext.Family,
      "with peers": SocialContext.Peers,
      "in crowd": SocialContext.Crowd
    })[matches[2] || ""]
  ]
}

/**
 *
 */
const fromLAMP = (value: [LocationContext?, SocialContext?]): string | undefined => {
  if (!value[0] && !value[1]) return undefined
  return Encrypt(
    "i am" +
      (<any>{
        home: " at home",
        school: " in school/class",
        work: " at work",
        hospital: " in clinic/hospital",
        outside: " outside",
        shopping: " shopping/dining",
        transit: " in bus/train/car"
      })[value[0] || ""] +
      (<any>{
        alone: "alone",
        friends: "with friends",
        family: "with family",
        peers: "with peers",
        crowd: "in crowd"
      })[value[1] || ""]
  )
}

const _decrypt = function(str: string) {
  let v = Decrypt(str)
  return !v || v === "" || v === "NA" ? null : v.toLowerCase()
}
const _convert = function(x: string | null, strip_suffix: string = "", convert_number: boolean = false) {
  return !x ? null : convert_number ? parseFloat(x.replace(strip_suffix, "")) : x.replace(strip_suffix, "")
}
const _clean = function(x: any) {
  return x === 0 ? null : x
}

/**
 *
 */
const HK_to_LAMP = {
  "lamp.height": (raw: string): any => ({ value: _convert(_decrypt(raw), " cm", true), units: "cm" }),
  "lamp.weight": (raw: string): any => ({ value: _convert(_decrypt(raw), " kg", true), units: "kg" }),
  "lamp.heart_rate": (raw: string): any => ({ value: _convert(_decrypt(raw), " bpm", true), units: "bpm" }),
  "lamp.blood_pressure": (raw: string): any => ({ value: _convert(_decrypt(raw), " mmhg", false), units: "mmHg" }),
  "lamp.respiratory_rate": (raw: string): any => ({
    value: _convert(_decrypt(raw), " breaths/min", true),
    units: "bpm"
  }),
  "lamp.sleep": (raw: string): any => ({ value: _decrypt(raw), units: "" }),
  "lamp.steps": (raw: string): any => ({ value: _clean(_convert(_decrypt(raw), " steps", true)), units: "steps" }),
  "lamp.flights": (raw: string): any => ({ value: _clean(_convert(_decrypt(raw), " steps", true)), units: "flights" }),
  "lamp.segment": (raw: string): any => ({ value: _convert(_decrypt(raw), "", true), units: "" }),
  "lamp.distance": (raw: string): any => ({ value: _convert(_decrypt(raw), " meters", true), units: "meters" })
}

/**
 *
 */
const LAMP_to_HK = {
  // TODO: Consider 0/NA values
  "lamp.height": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} cm`,
  "lamp.weight": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} kg`,
  "lamp.heart_rate": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} bpm`,
  "lamp.blood_pressure": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} mmhg`,
  "lamp.respiratory_rate": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} breaths/min`,
  "lamp.sleep": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)}`,
  "lamp.steps": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} steps`,
  "lamp.flights": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} steps`,
  "lamp.segment": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)}`,
  "lamp.distance": (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} meters`
}

/**
 *
 */
const HK_LAMP_map = {
  "lamp.height": "Height",
  "lamp.weight": "Weight",
  "lamp.heart_rate": "HeartRate",
  "lamp.blood_pressure": "BloodPressure",
  "lamp.respiratory_rate": "RespiratoryRate",
  "lamp.sleep": "Sleep",
  "lamp.steps": "Steps",
  "lamp.flights": "FlightClimbed",
  "lamp.segment": "Segment",
  "lamp.distance": "Distance",
  Height: "lamp.height",
  Weight: "lamp.weight",
  HeartRate: "lamp.heart_rate",
  BloodPressure: "lamp.blood_pressure",
  RespiratoryRate: "lamp.respiratory_rate",
  Sleep: "lamp.sleep",
  Steps: "lamp.steps",
  FlightClimbed: "lamp.flights",
  Segment: "lamp.segment",
  Distance: "lamp.distance"
}
