import { SQL, Encrypt, Decrypt, Download } from "../app"
import { IResult } from "mssql"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { Activity } from "../model/Activity"
import { ActivityEvent, TemporalSlice } from "../model/ActivityEvent"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { ActivityRepository } from "../repository/ActivityRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"

// FIXME: LIMIT NOT RESPECTED CORRECTLY (!!!)

export class ActivityEventRepository {
  /**
   * Get a set of `ActivityEvent`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string,

    /**
     *
     */
    activity_id_or_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number,

    limit?: number
  ): Promise<ActivityEvent[]> {
    // Get the correctly scoped identifier to search within.
    let user_id: string | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      user_id = ParticipantRepository._unpack_id(id).study_id
    else if (!!id) throw new Error("400.invalid-identifier")

    user_id = !!user_id ? Encrypt(user_id) : user_id
    let conds = [
      !!user_id ? `Users.StudyId = '${user_id}'` : null,
      !!admin_id ? `Users.AdminID = '${admin_id}'` : null,
      !!from_date ? `DATEDIFF_BIG(MS, '1970-01-01', timestamp) >= ${from_date}` : null,
      !!to_date ? `DATEDIFF_BIG(MS, '1970-01-01', timestamp) <= ${to_date}` : null
    ].filter(x => !!x)
    let str = conds.length > 0 ? "WHERE " + conds.join(" AND ") : ""

    // Collect the set of legacy Activity tables and stitch the full query.
    let result = (
      await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
		`)
    ).recordset.map(async (entry: any) => {
      // Perform the result lookup for every Activity table.
      let events = (
        await SQL!.request().query(`
				SELECT TOP ${limit}
					Users.StudyId AS uid,
	                [${entry.IndexColumnName}] AS id,
	                DATEDIFF_BIG(MS, '1970-01-01', [${entry.StartTimeColumnName}]) AS timestamp,
	                DATEDIFF_BIG(MS, [${entry.StartTimeColumnName}], [${entry.EndTimeColumnName}]) AS duration,
	                ${!entry.Slot1Name ? "" : `[${entry.Slot1ColumnName}] AS [static_data.${entry.Slot1Name}],`}
	                ${!entry.Slot2Name ? "" : `[${entry.Slot2ColumnName}] AS [static_data.${entry.Slot2Name}],`}
	                ${!entry.Slot3Name ? "" : `[${entry.Slot3ColumnName}] AS [static_data.${entry.Slot3Name}],`}
	                ${!entry.Slot4Name ? "" : `[${entry.Slot4ColumnName}] AS [static_data.${entry.Slot4Name}],`}
	                ${!entry.Slot5Name ? "" : `[${entry.Slot5ColumnName}] AS [static_data.${entry.Slot5Name}],`}
	                Users.AdminID AS aid
	            FROM [${entry.TableName}]
	            LEFT JOIN Users
	                ON [${entry.TableName}].UserID = Users.UserID
	            ${str.replace(/timestamp/g, `[${entry.StartTimeColumnName}]`)};
			`)
      ).recordset

      if (events.length === 0) return []

      // If temporal events are recorded by the activity, look all of them up as well.
      let slices: any[] = []
      if (!!entry.TemporalTableName) {
        slices = (
          await SQL!.request().query(`
	                SELECT
	                    [${entry.TemporalTableName}].[${entry.IndexColumnName}] AS parent_id,
	                    ${
                        !!entry.Temporal1ColumnName
                          ? `[${entry.TemporalTableName}].[${entry.Temporal1ColumnName}]`
                          : "(NULL)"
                      } AS item,
	                    ${
                        !!entry.Temporal2ColumnName
                          ? `[${entry.TemporalTableName}].[${entry.Temporal2ColumnName}]`
                          : "(NULL)"
                      } AS value,
	                    ${
                        !!entry.Temporal3ColumnName
                          ? `[${entry.TemporalTableName}].[${entry.Temporal3ColumnName}]`
                          : "(NULL)"
                      } AS type,
	                    ${
                        !!entry.Temporal4ColumnName
                          ? `CAST(CAST([${entry.TemporalTableName}].[${entry.Temporal4ColumnName}] AS float) * 1000 AS bigint)`
                          : "(NULL)"
                      } AS duration,
	                    ${
                        !!entry.Temporal5ColumnName
                          ? `[${entry.TemporalTableName}].[${entry.Temporal5ColumnName}]`
                          : "(NULL)"
                      } AS level
	                FROM [${entry.TemporalTableName}]
	                LEFT JOIN [${entry.TableName}]
	                    ON [${entry.TableName}].[${entry.IndexColumnName}] = [${entry.TemporalTableName}].[${
            entry.IndexColumnName
          }]
		            LEFT JOIN Users
		                ON [${entry.TableName}].UserID = Users.UserID
	                ${str};
				`)
        ).recordset
      }

      // Map from SQL DB to the local ActivityEvent type.
      let res = events.map(async (row: any) => {
        let activity_event = new ActivityEvent()
        activity_event.timestamp = parseInt(row.timestamp)
        activity_event.duration = parseInt(row.duration)
        ;(<any>activity_event).parent = !!admin_id ? Decrypt(row.uid) : undefined

        // Map internal ID sub-components into the single mangled ID form.
        activity_event.activity = ActivityRepository._pack_id({
          activity_spec_id: entry.ActivityIndexID,
          admin_id: row.aid,
          survey_id: entry.ActivityIndexID !== "1" /* survey */ ? 0 : row[`static_data.${entry.Slot2Name}`] || 0
        })

        // Copy static data fields if declared.
        activity_event.static_data = {}
        if (!!entry.Slot1ColumnName) activity_event.static_data[entry.Slot1Name] = row[`static_data.${entry.Slot1Name}`]
        if (!!entry.Slot2ColumnName) activity_event.static_data[entry.Slot2Name] = row[`static_data.${entry.Slot2Name}`]
        if (!!entry.Slot3ColumnName) activity_event.static_data[entry.Slot3Name] = row[`static_data.${entry.Slot3Name}`]
        if (!!entry.Slot4ColumnName) activity_event.static_data[entry.Slot4Name] = row[`static_data.${entry.Slot4Name}`]
        if (!!entry.Slot5ColumnName) activity_event.static_data[entry.Slot5Name] = row[`static_data.${entry.Slot5Name}`]

        // Decrypt all static data properties if known to be encrypted.
        // TODO: Encryption of fields should also be found in the ActivityIndex table!
        if (!!activity_event.static_data.survey_name)
          activity_event.static_data.survey_name =
            Decrypt(activity_event.static_data.survey_name) || activity_event.static_data.survey_name
        activity_event.static_data.survey_id = undefined
        if (!!activity_event.static_data.drawn_fig_file_name) {
          let fname =
            "https://api.lamp.digital/_assets/3dfigure/" +
            (Decrypt(activity_event.static_data.drawn_fig_file_name) || activity_event.static_data.drawn_fig_file_name)
          activity_event.static_data.drawn_figure = fname //(await Download(fname)).toString('base64')
          activity_event.static_data.drawn_fig_file_name = undefined
        }
        if (!!activity_event.static_data.scratch_file_name) {
          let fname =
            "https://api.lamp.digital/_assets/scratch/" +
            (Decrypt(activity_event.static_data.scratch_file_name) || activity_event.static_data.scratch_file_name)
          activity_event.static_data.scratch_figure = fname //(await Download(fname)).toString('base64')
          activity_event.static_data.scratch_file_name = undefined
        }
        if (!!activity_event.static_data.game_name)
          activity_event.static_data.game_name =
            Decrypt(activity_event.static_data.game_name) || activity_event.static_data.game_name
        if (!!activity_event.static_data.collected_stars)
          activity_event.static_data.collected_stars =
            Decrypt(activity_event.static_data.collected_stars) || activity_event.static_data.collected_stars
        if (!!activity_event.static_data.total_jewels_collected)
          activity_event.static_data.total_jewels_collected =
            Decrypt(activity_event.static_data.total_jewels_collected) ||
            activity_event.static_data.total_jewels_collected
        if (!!activity_event.static_data.total_bonus_collected)
          activity_event.static_data.total_bonus_collected =
            Decrypt(activity_event.static_data.total_bonus_collected) ||
            activity_event.static_data.total_bonus_collected
        if (!!activity_event.static_data.score)
          activity_event.static_data.score =
            Decrypt(activity_event.static_data.score) || activity_event.static_data.score

        // Copy all temporal events for this result event by matching parent ID.
        if (!!slices) {
          activity_event.temporal_slices = slices
            .filter(slice_row => slice_row.parent_id === row.id)
            .map(slice_row => {
              let temporal_slice = new TemporalSlice()
              temporal_slice.item = slice_row.item
              temporal_slice.value = slice_row.value
              temporal_slice.type = slice_row.type
              temporal_slice.duration = parseInt(slice_row.duration)
              temporal_slice.level = slice_row.level

              // Special treatment for surveys with encrypted answers.
              if (entry.ActivityIndexID === "1" /* survey */) {
                temporal_slice.item = Decrypt(temporal_slice.item) || temporal_slice.item
                temporal_slice.value = Decrypt(temporal_slice.value) || temporal_slice.value
                temporal_slice.type = !temporal_slice.type ? undefined : (<string>temporal_slice.type).toLowerCase()

                // Adjust the Likert scaled values to numbers.
                if (["Not at all", "12:00AM - 06:00AM", "0-3"].indexOf(temporal_slice.value) >= 0) {
                  temporal_slice.value = 0
                } else if (["Several Times", "06:00AM - 12:00PM", "3-6"].indexOf(temporal_slice.value) >= 0) {
                  temporal_slice.value = 1
                } else if (["More than Half the Time", "12:00PM - 06:00PM", "6-9"].indexOf(temporal_slice.value) >= 0) {
                  temporal_slice.value = 2
                } else if (["Nearly All the Time", "06:00PM - 12:00AM", ">9"].indexOf(temporal_slice.value) >= 0) {
                  temporal_slice.value = 3
                }
              }
              return temporal_slice
            })
        }

        // Finally return the newly created event.
        return activity_event
      })
      return (<ActivityEvent[]>[]).concat(...(await Promise.all(res)))
    })
    let all_res = (<ActivityEvent[]>[]).concat(...(await Promise.all(result)))

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
   * Add a new `ActivityEvent` with new fields.
   */
  public static async _insert(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     * The new object to append.
     */
    object: ActivityEvent
  ): Promise<{}> {
    let transaction = SQL!.transaction()
    await transaction.begin()

    try {
      let user_id = Encrypt(ParticipantRepository._unpack_id(participant_id).study_id)
      let { activity_spec_id, admin_id, survey_id } = ActivityRepository._unpack_id(object.activity!)

      // Collect the set of legacy Activity tables and stitch the full query.
      let tableset = (
        await SQL!.request().query(`
				SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
			`)
      ).recordset
      let tablerow = tableset.filter((x: any) => parseInt(x["ActivityIndexID"]) === activity_spec_id)[0]

      let userIDset = (
        await SQL!.request().query(`
				SELECT TOP 1 UserID FROM LAMP.dbo.Users WHERE StudyId = '${user_id}';
			`)
      ).recordset

      // First consume the timestamp + duration fields that are always present.
      // FIXME: millisecond precision is lost!!
      let columns: any = {}
      let startTime = (object.timestamp as number) || 0
      let endTime = ((object.timestamp as number) || 0) + ((object.duration as number) || 1)
      columns[
        tablerow["StartTimeColumnName"]
      ] = `DATEADD(s, CONVERT(BIGINT, ${startTime}) / 1000, CONVERT(DATETIME, '1-1-1970 00:00:00'))`
      columns[
        tablerow["EndTimeColumnName"]
      ] = `DATEADD(s, CONVERT(BIGINT, ${endTime}) / 1000, CONVERT(DATETIME, '1-1-1970 00:00:00'))`

      // We only support 5 static slots; check if they're used by the activity first.
      for (let x of [1, 2, 3, 4, 5]) {
        if (!!tablerow[`Slot${x}Name`] && tablerow[`Slot${x}ColumnName`] !== "SurveyID") {
          let value = object.static_data[tablerow[`Slot${x}Name`]]
          let isString = typeof value === "string" || value instanceof String
          if (tablerow[`Slot${x}ColumnName`] === "SurveyName") {
            value = Encrypt(value) // FIXME
            columns["SurveyType"] = 3 // FIXME
            columns["SurveyID"] = survey_id // FIXME
          }

          columns[tablerow[`Slot${x}ColumnName`]] = isString ? `'${_escapeMSSQL(value)}'` : value
        }
      }

      // Convert the static array into SQL strings.
      let static_keys = Object.keys(columns).join(", ")
      let static_values = Object.values(columns).join(", ")

      // Insert row, returning the generated primary key ID.
      let result: any = (
        await transaction.request().query(`
		    	INSERT INTO ${tablerow["TableName"]} (
		    		UserID,
		    		Status,
	                ${static_keys}
	            )
	            OUTPUT INSERTED.${tablerow["IndexColumnName"]} AS id
				VALUES (
					${userIDset[0]["UserID"]},
					2,
			        ${static_values}
				);
		    `)
      ).recordset

      // Bail early if there was a failure to record the parent event row.
      if (result.length === 0) throw new Error("404.object-not-found")
      if (!tablerow["TemporalTableName"] || (object.temporal_slices || []).length === 0) {
        await transaction.commit()
        return {} //result[0]
      }

      // Now the temporal fields are mapped for each sub-event.
      let temporals = (object.temporal_slices || [])
        .map(event =>
          [
            [tablerow["IndexColumnName"], result[0].id],
            [tablerow["Temporal1ColumnName"], event.item || "NULL"],
            [tablerow["Temporal2ColumnName"], event.value || "NULL"],
            [tablerow["Temporal3ColumnName"], event.type || "NULL"],
            [tablerow["Temporal4ColumnName"], event.duration || "0"],
            [tablerow["Temporal5ColumnName"], event.level || "NULL"]
          ].reduce((prev, curr) => {
            if (curr[0] === null) return prev
            ;(<any>prev)[curr[0]] = curr[1]
            return prev
          }, {})
        )
        .map((x: any) => {
          if (!!x["Question"]) x["Question"] = `'${_escapeMSSQL(Encrypt(x["Question"])!)}'`
          if (!!x["CorrectAnswer"]) x["CorrectAnswer"] = `'${_escapeMSSQL(Encrypt(x["CorrectAnswer"])!)}'`
          return x
        })

      // Convert the temporal arrays into SQL strings.
      let temporal_keys = `(${Object.keys(temporals[0]).join(", ")})`
      let temporal_values = temporals.map(x => `(${Object.values(x).join(", ")})`).join(", ")

      // Insert sub-rows, without returning anything.
      let result2 = await transaction.request().query(`
		    	INSERT INTO ${tablerow["TemporalTableName"]} ${temporal_keys}
				VALUES ${temporal_values};
		    `)

      // Bail early if there was a failure to record the parent event row.
      if (result2.rowsAffected[0] === 0) throw new Error("404.object-not-found")

      // Return the new parent row's ID.
      await transaction.commit()
      return {} //!!result2 ? result : null;
    } catch (e) {
      await transaction.rollback()
      throw e
    }
  }

  /**
   * Deletes a `ActivityEvent` row.
   */
  public static async _delete(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     *
     */
    activity_id_or_spec?: string,

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
		let user_id = Encrypt(ParticipantRepository._unpack_id(participant_id).study_id)

		// Collect the set of legacy Activity tables and stitch the full query.
		let tableset = (await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
		`)).recordset;

		// TODO: Deletion is not supported! CreatedOn is not correctly used here.
		(await SQL!.request().query(`
			UPDATE ${tablerow['TableName']} SET CreatedOn = NULL WHERE ${tablerow['IndexColumnName']} = ${type_id};
		`)).recordset;
		*/
    return {}
  }
}

const _escapeMSSQL = (val: string) =>
  val.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s: string) => {
    switch (s) {
      case "\0":
        return "\\0"
      case "\n":
        return "\\n"
      case "\r":
        return "\\r"
      case "\b":
        return "\\b"
      case "\t":
        return "\\t"
      case "\x1a":
        return "\\Z"
      case "'":
        return "''"
      case '"':
        return '""'
      default:
        return "\\" + s
    }
  })
