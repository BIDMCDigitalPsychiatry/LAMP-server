import { SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { SensorEvent, SensorName, LocationContext, SocialContext } from "../model/SensorEvent"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"

export class SensorEventRepository {
  /**
   * Get a set of `SensorEvent`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string,

    /**
     *
     */
    sensor_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number,

    limit?: number
  ): Promise<SensorEvent[]> {
    // Get the correctly scoped identifier to search within.
    let user_id: string | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      user_id = ParticipantRepository._unpack_id(id).study_id
    else if (!!id) throw new Error("400.invalid-identifier")
    user_id = !!user_id ? Encrypt(user_id) : undefined

    let result1 = (
      await SQL!.request().query(`
				SELECT TOP ${limit}
					timestamp, 
					type, 
					data, 
					X.StudyId AS parent
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
				) X
				WHERE X.IsDeleted = 0
					${!!user_id ? `AND X.StudyId = '${user_id}'` : ""}
					${!!admin_id ? `AND X.AdminID = '${admin_id}'` : ""}
					${!!from_date ? `AND X.timestamp >= ${from_date}` : ""}
					${!!to_date ? `AND X.timestamp <= ${to_date}` : ""}
		;`)
    ).recordset.map((raw: any) => {
      let obj = new SensorEvent()
      obj.timestamp = raw.timestamp
      obj.sensor = <SensorName>Object.entries(HK_LAMP_map).filter(x => x[1] === <string>raw.type)[0][0]
      obj.data = ((<any>HK_to_LAMP)[obj.sensor!] || ((x: any) => x))(raw.data)
      ;(<any>obj).parent = !!admin_id ? Decrypt(raw.parent) : undefined
      return obj
    })

    let result2 = (
      await SQL!.request().query(`
			SELECT TOP ${limit}
                DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) AS timestamp,
                Latitude AS lat,
                Longitude AS long,
                LocationName AS location_name,
                Users.StudyId AS parent
            FROM Locations
            LEFT JOIN Users
                ON Locations.UserID = Users.UserID
            WHERE IsDeleted = 0 
                ${!!user_id ? `AND Users.StudyId = '${user_id}'` : ""}
                ${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ""}
                ${!!from_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) >= ${from_date}` : ""}
                ${!!to_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) <= ${to_date}` : ""}
		;`)
    ).recordset.map((raw: any) => {
      let x = toLAMP(raw.location_name)
      let obj = new SensorEvent()
      obj.timestamp = raw.timestamp
      obj.sensor = SensorName.ContextualLocation
      obj.data = {
        latitude: parseFloat(Decrypt(raw.lat) || raw.lat),
        longitude: parseFloat(Decrypt(raw.long) || raw.long),
        accuracy: 1,
        context: {
          environment: x[0] || null,
          social: x[1] || null
        }
      }
      ;(<any>obj).parent = !!admin_id ? Decrypt(raw.parent) : undefined
      return obj
    })

    let result3 = (
      await SQL!.request().query(`
			SELECT TOP ${limit}
				timestamp, sensor_name, data, Users.StudyId AS parent
			FROM LAMP_Aux.dbo.CustomSensorEvent
            LEFT JOIN Users
            	ON CustomSensorEvent.UserID = Users.UserID
			WHERE Users.IsDeleted = 0
	            ${!!user_id ? `AND Users.StudyId = '${user_id}'` : ""}
	            ${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ""}
	            ${!!from_date ? `AND timestamp >= ${from_date}` : ""}
				${!!to_date ? `AND timestamp <= ${to_date}` : ""}
		;`)
    ).recordset.map((raw: any) => {
      let obj = new SensorEvent()
      obj.timestamp = raw.timestamp
      obj.sensor = raw.sensor_name
      obj.data = JSON.parse(raw.data)
      ;(<any>obj).parent = !!admin_id ? Decrypt(raw.parent) : undefined
      return obj
    })

    let all_res = [...result1, ...result2, ...result3].sort((a, b) => <number>a.timestamp - <number>b.timestamp)

    // Perform a group-by operation on the participant ID if needed.
    return !admin_id
      ? all_res
      : all_res.reduce((prev, curr: any) => {
          let key = (<any>curr).parent
          ;(prev[key] ? prev[key] : (prev[key] = null || [])).push({ ...curr, parent: undefined })
          return prev
        }, <any>{})
  }

  /**
   * Create a `SensorEvent` with a new object.
   */
  public static async _insert(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     * The new object.
     */
    objects: SensorEvent[]
  ): Promise<{}> {
    let userID = (
      await SQL!.request().query(`
			SELECT UserID 
			FROM Users 
			WHERE StudyId = '${Encrypt(ParticipantRepository._unpack_id(participant_id).study_id)}'
	    ;`)
    ).recordset[0]["UserID"]

    return (
      await SQL!.request().query(`
            INSERT INTO LAMP_Aux.dbo.CustomSensorEvent (
                UserID, timestamp, sensor_name, data
            )
            VALUES ${objects
              .map(
                object => `(
                ${userID}, 
                ${object.timestamp!},
                '${object.sensor}', 
                '${JSON.stringify(object.data)}'
            )`
              )
              .join(",\n")};
	    `)
    ).recordset
  }

  /**
   * Delete a `SensorEvent` row.
   */
  public static async _delete(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     *
     */
    sensor_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number
  ): Promise<{}> {
    throw new Error("503.unimplemented")

    /*
		let user_id = Encrypt(ParticipantRepository._unpack_id(participant_id).study_id);

		// TODO: Deletion is not supported! EditedOn is not correctly used here.
		(await SQL!.request().query(`
			UPDATE HealthKit_DailyValues 
            LEFT JOIN Users
                ON HealthKit_DailyValues.UserID = Users.UserID
			SET EditedOn = NULL 
			WHERE Users.StudyId = ${user_id}
                ${!!from_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', HealthKit_DailyValues.CreatedOn) >= ${from_date}` : ''}
                ${!!to_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', HealthKit_DailyValues.CreatedOn) <= ${to_date}` : ''}
		`)).recordset;
		(await SQL!.request().query(`
			UPDATE Locations 
            LEFT JOIN Users
                ON Locations.UserID = Users.UserID
			SET Type = 0 
			WHERE Users.StudyId = ${user_id}
                ${!!from_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) >= ${from_date}` : ''}
                ${!!to_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) <= ${to_date}` : ''}
		`)).recordset;
		*/
    return {}
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
        home: " home",
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
