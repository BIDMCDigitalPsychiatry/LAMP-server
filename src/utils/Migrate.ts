import { Database, uuid } from "../app"
import { Decrypt } from "../repository"
import { LegacyActivities } from "./LegacyAPI"
import sql from "mssql"

let _SQL: sql.ConnectionPool | undefined = undefined

// Establish the SQL connection.
async function SQL(): Promise<sql.ConnectionPool> {
  if (_SQL !== undefined) return _SQL
  _SQL = await new sql.ConnectionPool({
    ...require("mssql/lib/connectionstring").resolve(process.env.DB || "mssql://"),
    parseJSON: true,
    stream: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    options: {
      encrypt: true,
      appName: "LAMP-server",
      enableArithAbort: false,
      abortTransactionOnError: true,
    },
    pool: {
      min: 1,
      max: 100,
      idleTimeoutMillis: 30000,
    },
  }).connect()
  return _SQL
}

// old ID (table PK) -> new ID (random UUID)
export const _migrator_lookup_table = async (): Promise<{ [key: string]: string }> => {
  return (await _migrator_dual_table())[0]
}

// new ID (random UUID) -> old ID (table PK)
export const _migrator_export_table = async (): Promise<{ [key: string]: string }> => {
  return (await _migrator_dual_table())[1]
}

// BOTH of the above; more performant as well
export const _migrator_dual_table = async (): Promise<[{ [key: string]: string }, { [key: string]: string }]> => {
  const _res = await Database.use("migrator").baseView("", "", { viewPath: "_local_docs" }, { include_docs: true })
  const output: { [key: string]: string }[] = [{}, {}]
  for (const x of _res.rows) {
    output[0][x.id.replace("_local/", "")] = x.doc.value
    output[1][x.doc.value] = x.id.replace("_local/", "")
  }
  return output as any
}

export async function _migrate_researcher_and_study(): Promise<void> {
  try {
    const MigratorLink = Database.use("migrator")
    const _lookup_table = await _migrator_lookup_table()
    const _lookup_migrator_id = (legacyID: string): string => {
      let match = _lookup_table[legacyID]
      if (match === undefined) {
        match = uuid() // 20-char id for non-Participant objects
        _lookup_table[legacyID] = match
        console.log(`inserting migrator link: ${legacyID} => ${match}`)
        MigratorLink.insert({ _id: `_local/${legacyID}`, value: match } as any)
      }
      return match
    }
    const result = await (await SQL()).request().query(`
      SELECT 
          AdminID AS _id,
          FirstName AS fname, 
          LastName AS lname,
          IsDeleted AS _deleted
      FROM Admin
    ;`)
    const output = {
      docs:
        result?.recordset?.map((x: any, idx: number) => ({
          _id: _lookup_migrator_id(Study_pack_id({ admin_id: x._id })),
          _deleted: x._deleted,
          "#parent": _lookup_migrator_id(Researcher_pack_id({ admin_id: x._id })),
          timestamp: new Date().getTime() - (result.recordset.length - idx),
          name: [Decrypt(x.fname), Decrypt(x.lname)].join(" "),
        })) ?? [],
    }
    const output2 = {
      docs:
        result?.recordset?.map((x: any, idx: number) => ({
          _id: _lookup_migrator_id(Researcher_pack_id({ admin_id: x._id })),
          _deleted: x._deleted,
          "#parent": null,
          timestamp: new Date().getTime() - (result.recordset.length - idx),
          name: [Decrypt(x.fname), Decrypt(x.lname)].join(" "),
        })) ?? [],
    }
    Database.use("study").bulk(output)
    Database.use("researcher").bulk(output2)
    //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
    //fs.writeFileSync("./test2.json", JSON.stringify(output2, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function _migrate_participant(): Promise<void> {
  try {
    const MigratorLink = Database.use("migrator")
    const _lookup_table = await _migrator_lookup_table()
    const _lookup_migrator_id = (legacyID: string): string => {
      let match = _lookup_table[legacyID]
      if (match === undefined) {
        match = uuid() // 20-char id for non-Participant objects
        _lookup_table[legacyID] = match
        console.log(`inserting migrator link: ${legacyID} => ${match}`)
        MigratorLink.insert({ _id: `_local/${legacyID}`, value: match } as any)
      }
      return match
    }
    const result = await (await SQL()).request().query(`
      SELECT 
          UserID AS _oldID,
          AdminID AS _parent,
          StudyId AS _id, 
          IsDeleted AS _deleted
      FROM Users
    ;`)
    const output = {
      docs:
        result?.recordset?.map((x: any, idx: number) => ({
          _id: Decrypt(x._id)?.replace(/G/g, ""),
          _deleted: x._deleted,
          "#parent": _lookup_migrator_id(Study_pack_id({ admin_id: x._parent })),
          timestamp: new Date().getTime() - (result.recordset.length - idx),
        })) ?? [],
    }
    Database.use("participant").bulk(output)
    //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function _migrate_activity(): Promise<void> {
  try {
    const MigratorLink = Database.use("migrator")
    const _lookup_table = await _migrator_lookup_table()
    const _lookup_migrator_id = (legacyID: string): string => {
      let match = _lookup_table[legacyID]
      if (match === undefined) {
        match = uuid() // 20-char id for non-Participant objects
        _lookup_table[legacyID] = match
        console.log(`inserting migrator link: ${legacyID} => ${match}`)
        MigratorLink.insert({ _id: `_local/${legacyID}`, value: match } as any)
      }
      return match
    }
    const resultBatch = (
      await (await SQL()).request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				AdminID AS aid,
				BatchName AS name, 
				('batch') AS type
			FROM Admin_BatchSchedule
      WHERE IsDeleted = 0 
		;`)
    ).recordset
    const resultBatchCTestSettings = (
      await (await SQL()).request().query(`
			SELECT 
				Admin_BatchScheduleCTest.AdminBatchSchID AS id, 
				Admin_CTestSettings.AdminCTestSettingID AS ctest_id,
				[Order] AS [order]
      FROM Admin_BatchScheduleCTest
      JOIN Admin_BatchSchedule
        ON Admin_BatchSchedule.AdminBatchSchID = Admin_BatchScheduleCTest.AdminBatchSchID
			JOIN Admin_CTestSettings
        ON Admin_CTestSettings.CTestID = Admin_BatchScheduleCTest.CTestID 
        AND Admin_CTestSettings.AdminID = Admin_BatchSchedule.AdminID
			WHERE Admin_BatchScheduleCTest.AdminBatchSchID IN (${
        resultBatch.length === 0 ? "NULL" : resultBatch.map((x) => x.id).join(",")
      })
		;`)
    ).recordset
    const resultBatchSurveySettings = (
      await (await SQL()).request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				SurveyID AS survey_id, 
				[Order] AS [order]
			FROM Admin_BatchScheduleSurvey
			WHERE AdminBatchSchID IN (${resultBatch.length === 0 ? "NULL" : resultBatch.map((x) => x.id).join(",")})
		;`)
    ).recordset
    const resultBatchSchedule = (
      await (await SQL()).request().query(`
			SELECT
				AdminBatchSchID AS id, 
				ScheduleDate as start_date,
				Time as time,
				CHOOSE(RepeatID, 
					'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
					'biweekly', 'triweekly', 'weekly', 'bimonthly', 
					'monthly', 'custom', 'none'
				) AS repeat_interval, 
				(
					SELECT 
						Time AS t
					FROM Admin_BatchScheduleCustomTime
					WHERE Admin_BatchScheduleCustomTime.AdminBatchSchId = Admin_BatchSchedule.AdminBatchSchId
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS custom_time
			FROM Admin_BatchSchedule
			WHERE IsDeleted = 0 
				AND AdminBatchSchID IN (${resultBatch.length === 0 ? "NULL" : resultBatch.map((x) => x.id).join(",")})
		;`)
    ).recordset
    const resultSurvey = (
      await (await SQL()).request().query(`
			SELECT 
				SurveyID AS id, 
				AdminID AS aid,
				SurveyName AS name, 
				('survey') AS type
			FROM Survey
			WHERE IsDeleted = 0 
		;`)
    ).recordset
    const resultSurveyQuestions = (
      await (await SQL()).request().query(`
			SELECT 
				SurveyID AS id,
				QuestionText AS text, 
				CHOOSE(AnswerType, 
					'likert', 'list', 'boolean', 'clock', 'years', 'months', 'days', 'text'
				) AS type, 
				(
					SELECT 
						OptionText AS opt
					FROM SurveyQuestionOptions
					WHERE SurveyQuestionOptions.QuestionID = SurveyQuestions.QuestionID
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS options
				FROM SurveyQuestions
				WHERE IsDeleted = 0 
					AND SurveyID IN (${resultSurvey.length === 0 ? "NULL" : resultSurvey.map((x) => x.id).join(",")})
		;`)
    ).recordset
    const resultSurveySchedule = (
      await (await SQL()).request().query(`
			SELECT
				SurveyID AS id, 
				ScheduleDate as start_date,
				Time as time,
				CHOOSE(RepeatID, 
					'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
					'biweekly', 'triweekly', 'weekly', 'bimonthly', 
					'monthly', 'custom', 'none'
				) AS repeat_interval, 
				(
					SELECT 
						Time AS t
					FROM Admin_SurveyScheduleCustomTime
					WHERE Admin_SurveyScheduleCustomTime.AdminSurveySchId = Admin_SurveySchedule.AdminSurveySchId
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS custom_time
			FROM Admin_SurveySchedule
			WHERE IsDeleted = 0 
				AND Admin_SurveySchedule.SurveyID IN (${resultSurvey.length === 0 ? "NULL" : resultSurvey.map((x) => x.id).join(",")})
		;`)
    ).recordset
    const resultTest = (
      await (await SQL()).request().query(`
      SELECT 
        AdminCTestSettingID AS id,
				AdminID AS aid,
        ('ctest') AS type,
        CTestID AS ctest_id
			FROM Admin_CTestSettings
      WHERE Status IN (1, NULL)
        AND CTestID NOT IN (4, 13)
		;`)
    ).recordset
    const resultTestJewelsSettings = (
      await (await SQL()).request().query(`
			SELECT 
				('a') AS type,
				NoOfSeconds_Beg AS beginner_seconds,
				NoOfSeconds_Int AS intermediate_seconds,
				NoOfSeconds_Adv AS advanced_seconds,
				NoOfSeconds_Exp AS expert_seconds,
				NoOfDiamonds AS diamond_count,
				NoOfShapes AS shape_count,
				NoOfBonusPoints AS bonus_point_count,
				X_NoOfChangesInLevel AS x_changes_in_level_count,
				X_NoOfDiamonds AS x_diamond_count,
				Y_NoOfChangesInLevel AS y_changes_in_level_count,
				Y_NoOfShapes AS y_shape_count
			FROM Admin_JewelsTrailsASettings
			WHERE Admin_JewelsTrailsASettings.AdminID IN (${
        resultTest.length === 0 ? "NULL" : resultTest.map((x) => x.aid).join(",")
      })
			UNION ALL
			SELECT 
				('b') AS type,
				NoOfSeconds_Beg AS beginner_seconds,
				NoOfSeconds_Int AS intermediate_seconds,
				NoOfSeconds_Adv AS advanced_seconds,
				NoOfSeconds_Exp AS expert_seconds,
				NoOfDiamonds AS diamond_count,
				NoOfShapes AS shape_count,
				NoOfBonusPoints AS bonus_point_count,
				X_NoOfChangesInLevel AS x_changes_in_level_count,
				X_NoOfDiamonds AS x_diamond_count,
				Y_NoOfChangesInLevel AS y_changes_in_level_count,
				Y_NoOfShapes AS y_shape_count
			FROM Admin_JewelsTrailsBSettings
			WHERE Admin_JewelsTrailsBSettings.AdminID IN (${
        resultTest.length === 0 ? "NULL" : resultTest.map((x) => x.aid).join(",")
      })
		;`)
    ).recordset
    const resultTestSchedule = (
      await (await SQL()).request().query(`
			SELECT
				AdminCTestSettingID as setting_id,
				ScheduleDate as start_date,
				Time as time,
				CHOOSE(RepeatID, 
					'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
					'biweekly', 'triweekly', 'weekly', 'bimonthly', 
					'monthly', 'custom', 'none'
				) AS repeat_interval, 
				(
					SELECT 
						Time AS t
					FROM Admin_CTestScheduleCustomTime
					WHERE Admin_CTestScheduleCustomTime.AdminCTestSchId = Admin_CTestSchedule.AdminCTestSchId
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS custom_time
      FROM Admin_CTestSchedule
      JOIN Admin_CTestSettings 
        ON Admin_CTestSettings.AdminID = Admin_CTestSchedule.AdminID 
        AND Admin_CTestSettings.CTestID = Admin_CTestSchedule.CTestID
			WHERE IsDeleted = 0 
				AND AdminCTestSettingID IN (${resultTest.length === 0 ? "NULL" : resultTest.map((x) => x.id)})
		;`)
    ).recordset

    const ALL = [...resultBatch, ...resultSurvey, ...resultTest]
    const output2 = ALL.map((raw: any, idx: number) => {
      const obj: any = {}
      if (raw.type === "batch") {
        obj._id = _lookup_migrator_id(
          Activity_pack_id({
            group_id: raw.id,
          })
        )
        obj["#parent"] = _lookup_migrator_id(
          Study_pack_id({
            admin_id: raw.aid,
          })
        )
        obj.timestamp = new Date().getTime() - (ALL.length - idx)
        obj.spec = "lamp.group"
        obj.name = raw.name
        obj.settings = [
          ...resultBatchSurveySettings.filter((x) => x.id === raw.id),
          ...resultBatchCTestSettings.filter((x) => x.id === raw.id),
        ]
          .sort((x: any, y: any) => x.order - y.order)
          .map((x: any) =>
            _lookup_migrator_id(
              Activity_pack_id({
                ctest_id: !x.ctest_id ? undefined : x.ctest_id,
                survey_id: !x.survey_id ? undefined : x.survey_id,
              })
            )
          )
        obj.schedule = resultBatchSchedule
          .filter((x) => x.id === raw.id)
          .map((x) => ({
            ...x,
            id: undefined,
            custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t),
          })) as any
      } else if (raw.type === "survey") {
        obj._id = _lookup_migrator_id(
          Activity_pack_id({
            survey_id: raw.id,
          })
        )
        obj["#parent"] = _lookup_migrator_id(
          Study_pack_id({
            admin_id: raw.aid,
          })
        )
        obj.timestamp = new Date().getTime() - (ALL.length - idx)
        obj.spec = "lamp.survey"
        obj.name = raw.name
        obj.settings = resultSurveyQuestions
          .filter((x) => x.id === raw.id)
          .map((x) => ({
            ...x,
            id: undefined,
            options: !x.options ? null : JSON.parse(x.options).map((y: any) => y.opt),
          })) as any
        obj.schedule = resultSurveySchedule
          .filter((x) => x.id === raw.id)
          .map((x) => ({
            ...x,
            id: undefined,
            custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t),
          })) as any
      } else if (raw.type === "ctest") {
        obj._id = _lookup_migrator_id(
          Activity_pack_id({
            ctest_id: raw.id,
          })
        )
        obj["#parent"] = _lookup_migrator_id(
          Study_pack_id({
            admin_id: raw.aid,
          })
        )
        obj.timestamp = new Date().getTime() - (ALL.length - idx)

        const spec_map: { [string: string]: any } = {
          "lamp.group": "Activity Group",
          "lamp.survey": "Survey",
          "lamp.nback": "N-Back",
          "lamp.trails_b": "Trails B",
          "lamp.spatial_span": "Spatial Span",
          "lamp.simple_memory": "Simple Memory",
          "lamp.serial7s": "Serial 7s",
          "lamp.cats_and_dogs": "Cats and Dogs",
          "lamp.3d_figure_copy": "3D Figure Copy",
          "lamp.visual_association": "Visual Association",
          "lamp.digit_span": "Digit Span",
          "lamp.cats_and_dogs_new": "Cats and Dogs New",
          "lamp.temporal_order": "Temporal Order",
          "lamp.nback_new": "N-Back New",
          "lamp.trails_b_new": "Trails B New",
          "lamp.trails_b_dot_touch": "Trails B Dot Touch",
          "lamp.jewels_a": "Jewels Trails A",
          "lamp.jewels_b": "Jewels Trails B",
          "lamp.scratch_image": "Scratch Image",
          "lamp.spin_wheel": "Spin Wheel",
        }

        // FIXME: account for Forward/Backward variants that are not mapped!
        const specEntry = LegacyActivities.find((x) => x.LegacyCTestID === Number.parse(raw.ctest_id))
        obj.spec = specEntry.Name
        obj.name = spec_map[specEntry.Name]
        if (specEntry.Name === "lamp.jewels_a") {
          obj.settings = resultTestJewelsSettings
            .filter((x) => x.type === "a")
            .map((x) => ({ ...x, type: undefined }))[0] as any
        } else if (specEntry.Name === "lamp.jewels_b") {
          obj.settings = resultTestJewelsSettings
            .filter((x) => x.type === "b")
            .map((x) => ({ ...x, type: undefined }))[0] as any
        } else obj.settings = {}
        obj.schedule = resultTestSchedule
          .filter((x) => x.setting_id == raw.id)
          .map((x) => ({
            ...x,
            setting_id: undefined,
            custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t),
          })) as any
      } /* custom */ else {
        // We are just copying over the values one-by-one to prevent misc. properties getting added/lost.
        raw.object = JSON.parse(raw.object)
        obj._id = _lookup_migrator_id(Activity_pack_id({ custom_id: raw.custom_id }))
        obj.timestamp = new Date().getTime() - (ALL.length - idx)
        obj.spec = raw.object.spec
        obj.name = raw.object.name
        obj.settings = raw.object.settings
        obj.schedule = raw.object.schedule
      }
      return obj
    })
    const output = { docs: output2 }
    Database.use("activity").bulk(output)
    //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function _migrate_credential(_decrypt = false): Promise<void> {
  //const info = await Database.use("credential").info()
  //if (info.doc_count + info.doc_del_count > 0) return // already initialized
  try {
    const _lookup_table = await _migrator_lookup_table()
    const out1 = (
      await (await SQL()).request().query(`
        SELECT AdminID, Email, Password, IsDeleted
        FROM Admin
      ;`)
    ).recordset.map((x) => ({
      _deleted: x["IsDeleted"],
      origin: _lookup_table[Researcher_pack_id({ admin_id: Number.parse(x["AdminID"]) ?? 0 })],
      access_key: Decrypt(x["Email"]),
      secret_key: _decrypt ? Decrypt(x["Password"], "AES256") : x["Password"],
      description: "Default Credential",
    }))
    console.log(`[Credential_Admin] migrating ${out1.length} credentials`)
    const out2 = (
      await (await SQL()).request().query(`
        SELECT StudyId, Email, Password, IsDeleted
        FROM Users
      ;`)
    ).recordset.map((x) => ({
      _deleted: x["IsDeleted"],
      origin: Decrypt(x["StudyId"])?.replace(/G/g, ""),
      access_key: Decrypt(x["Email"]),
      secret_key: _decrypt ? Decrypt(x["Password"], "AES256") : x["Password"],
      description: "Default Credential",
    }))
    console.log(`[Credential_User] migrating ${out2.length} credentials`)
    const out3 = (
      await (await SQL()).request().query(`
        SELECT ObjectID, Value
        FROM LAMP_Aux.dbo.OOLAttachment
        WHERE ObjectType = 'Credential'
      ;`)
    ).recordset
      .map((x) => JSON.parse(x["Value"]))
      .map((x) => ({
        ...x,
        origin: x.origin.startsWith("UmVz") ? _lookup_table[x.origin] : x.origin,
        secret_key: _decrypt ? Decrypt(x.secret_key, "AES256") : x.secret_key,
      }))
    console.log(`[Credential_Tag] migrating ${out3.length} credentials`)
    const output = { docs: [...out1, ...out2, ...out3] }
    await Database.use("credential").bulk(output)
    //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function _migrate_tags(): Promise<void> {
  try {
    const _lookup_table = await _migrator_lookup_table()
    const result = await (await SQL()).request().query(`
        SELECT ObjectID, ObjectType, [Key], Value
        FROM LAMP_Aux.dbo.OOLAttachment
        WHERE ObjectType NOT IN ('CustomActivity', 'Credential')
    ;`)
    const output = {
      docs:
        result?.recordset?.map((x: any, idx: number) => ({
          "#parent": _lookup_table[x.ObjectID] ?? x.ObjectID,
          type: _lookup_table[x.ObjectType] ?? x.ObjectType,
          key: x.Key,
          value: JSON.parse(x.Value),
        })) ?? [],
    }
    Database.use("tag").bulk(output)
    //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
  } catch (e) {
    console.error(e)
  }
}

export async function _migrate_activity_event(): Promise<void> {
  const MigratorLink = Database.use("migrator")
  const _lookup_table = await _migrator_lookup_table()
  const _lookup_migrator_id = (legacyID: string): string => {
    let match = _lookup_table[legacyID]
    if (match === undefined) {
      match = uuid() // 20-char id for non-Participant objects
      _lookup_table[legacyID] = match
      console.log(`inserting migrator link: ${legacyID} => ${match}`)
      MigratorLink.insert({ _id: `_local/${legacyID}`, value: match } as any)
    }
    return match
  }

  const result = LegacyActivities.map(async (entry: any) => {
    const events = (
      await (await SQL()).request().query(`
        SELECT
          TOP 2
          Users.StudyId AS uid,
          [${entry.IndexColumnName}] AS id,
          DATEDIFF_BIG(MS, '1970-01-01', [${entry.StartTimeColumnName}]) AS timestamp,
          DATEDIFF_BIG(MS, [${entry.StartTimeColumnName}], [${entry.EndTimeColumnName}]) AS duration,
          ${!entry.Slot1Name ? "" : `[${entry.Slot1ColumnName}] AS [static_data.${entry.Slot1Name}],`}
          ${!entry.Slot2Name ? "" : `[${entry.Slot2ColumnName}] AS [static_data.${entry.Slot2Name}],`}
          ${!entry.Slot3Name ? "" : `[${entry.Slot3ColumnName}] AS [static_data.${entry.Slot3Name}],`}
          ${!entry.Slot4Name ? "" : `[${entry.Slot4ColumnName}] AS [static_data.${entry.Slot4Name}],`}
          ${!entry.Slot5Name ? "" : `[${entry.Slot5ColumnName}] AS [static_data.${entry.Slot5Name}],`}
          ${
            !!entry.TemporalTableName
              ? `(
              SELECT
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
              WHERE [${entry.TableName}].[${entry.IndexColumnName}] = [${entry.TemporalTableName}].[${
                  entry.IndexColumnName
                }]
              FOR JSON PATH, INCLUDE_NULL_VALUES
          ) AS [slices],`
              : "(NULL) AS [slices],"
          }
          ${
            entry.LegacyCTestID !== null
              ? `(
            SELECT AdminCTestSettingID 
              FROM Admin_CTestSettings
              WHERE Admin_CTestSettings.AdminID = Users.AdminID
                AND Admin_CTestSettings.CTestID = ${entry.LegacyCTestID}
            ) AS aid`
              : `SurveyID AS aid`
          }
        FROM [${entry.TableName}]
        LEFT JOIN Users
            ON [${entry.TableName}].UserID = Users.UserID
			;`)
    ).recordset

    console.dir(`[${entry.TableName}] migrating ${events.length} events`)
    if (events.length === 0) return []

    // Map from SQL DB to the local ActivityEvent type.
    const res = events.map((row: any) => {
      const activity_event: any = {}
      activity_event.timestamp = Number.parse(row.timestamp) ?? 0
      activity_event.duration = Number.parse(row.duration) ?? 0
      ;(activity_event as any)["#parent"] = Decrypt(row.uid)?.replace(/G/g, "")

      // Map internal ID sub-components into the single mangled ID form.
      const _activity_original_id = Activity_pack_id({
        ctest_id: entry.LegacyCTestID !== null ? row.aid : 0,
        survey_id: entry.LegacyCTestID === null ? row.aid : 0,
        group_id: 0,
      })
      activity_event.activity = _lookup_migrator_id(_activity_original_id)

      // Copy static data fields if declared.
      activity_event.static_data = {}
      if (!!entry.Slot1ColumnName) activity_event.static_data[entry.Slot1Name] = row[`static_data.${entry.Slot1Name}`]
      if (!!entry.Slot2ColumnName) activity_event.static_data[entry.Slot2Name] = row[`static_data.${entry.Slot2Name}`]
      if (!!entry.Slot3ColumnName) activity_event.static_data[entry.Slot3Name] = row[`static_data.${entry.Slot3Name}`]
      if (!!entry.Slot4ColumnName) activity_event.static_data[entry.Slot4Name] = row[`static_data.${entry.Slot4Name}`]
      if (!!entry.Slot5ColumnName) activity_event.static_data[entry.Slot5Name] = row[`static_data.${entry.Slot5Name}`]

      // Decrypt all static data properties if known to be encrypted.
      // TODO: Encryption of fields should also be found in the activity index table!
      if (!!activity_event.static_data.drawn_fig_file_name) {
        const fname =
          "file://./_assets/3dfigure/" +
          (Decrypt(activity_event.static_data.drawn_fig_file_name) || activity_event.static_data.drawn_fig_file_name)
        activity_event.static_data.drawn_figure = fname //(await Download(fname)).toString('base64')
        activity_event.static_data.drawn_fig_file_name = undefined
      }
      if (!!activity_event.static_data.scratch_file_name) {
        const fname =
          "file://./_assets/scratch/" +
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
          Decrypt(activity_event.static_data.total_bonus_collected) || activity_event.static_data.total_bonus_collected
      if (!!activity_event.static_data.score)
        activity_event.static_data.score = Decrypt(activity_event.static_data.score) || activity_event.static_data.score

      // Copy all temporal events for this result event by matching parent ID.
      activity_event.temporal_slices = JSON.parse(row.slices ?? "[]").map((slice_row: any) => {
        const temporal_slice: any = {}
        temporal_slice.item = slice_row.item
        temporal_slice.value = slice_row.value
        temporal_slice.type = slice_row.type
        temporal_slice.duration = Number.parse(slice_row.duration) ?? 0
        temporal_slice.level = slice_row.level

        // Special treatment for surveys with encrypted answers.
        if (entry.LegacyCTestID === null) {
          // survey
          temporal_slice.item = Decrypt(temporal_slice.item) || temporal_slice.item
          temporal_slice.value = Decrypt(temporal_slice.value) || temporal_slice.value
          temporal_slice.type = !temporal_slice.type ? null : (temporal_slice.type as string).toLowerCase()

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

      // Finally return the newly created event.
      return activity_event
    })
    return res
  })

  const output = { docs: ([] as any[]).concat(...(await Promise.all(result))) }
  await Database.use("activity_event").bulk(output)
  //fs.writeFileSync("./test.json", JSON.stringify(output, null, 2))
}

export async function _migrate_all(): Promise<void> {
  const _all_dbs = await Database.db.list()
  if (!_all_dbs.includes("migrator")) await Database.db.create("migrator")
  if (_all_dbs.includes("researcher") && _all_dbs.includes("study")) await _migrate_researcher_and_study()
  if (_all_dbs.includes("participant")) await _migrate_participant()
  if (_all_dbs.includes("activity")) await _migrate_activity()
  if (_all_dbs.includes("credential")) await _migrate_credential()
  if (_all_dbs.includes("tag")) await _migrate_tags()
  if (_all_dbs.includes("activity_event")) await _migrate_activity_event()
  if (_all_dbs.includes("migrator")) await Database.db.destroy("migrator")
}

export function Identifier_pack(components: any[]): string {
  if (components.length === 0) return ""
  return Buffer.from(components.join(":")).toString("base64").replace(/=/g, "~")
}
export function Identifier_unpack(components: string): any[] {
  if (components.match(/^G?U\d+$/)) return []
  return Buffer.from((<string>components).replace(/~/g, "="), "base64")
    .toString("utf8")
    .split(":")
}
export function Researcher_pack_id(components: { admin_id?: number }): string {
  return Identifier_pack(["Researcher", components.admin_id || 0])
}
export function Researcher_unpack_id(id: string): { admin_id: number } {
  const components = Identifier_unpack(id)
  if (components[0] !== "Researcher") throw new Error("400.invalid-identifier")
  const result = components.slice(1).map((x) => Number.parse(x) ?? 0)
  return { admin_id: result[0] }
}
export function Study_pack_id(components: { admin_id?: number }): string {
  return Identifier_pack(["Study", components.admin_id || 0])
}
export function Study_unpack_id(id: string): { admin_id: number } {
  const components = Identifier_unpack(id)
  if (components[0] !== "Study") throw new Error("400.invalid-identifier")
  const result = components.slice(1).map((x) => Number.parse(x) ?? 0)
  return { admin_id: result[0] }
}
export function Participant_pack_id(components: { study_id?: string }): string {
  return components.study_id || ""
}
export function Participant_unpack_id(id: string): { study_id: string } {
  return { study_id: id }
}
export function Activity_pack_id(components: {
  ctest_id?: number
  survey_id?: number
  group_id?: number
  custom_id?: number
}): string {
  return Identifier_pack(
    [
      "Activity",
      components.ctest_id || 0,
      components.survey_id || 0,
      components.group_id || 0,
      components.custom_id || undefined,
    ].filter((x) => x !== undefined)
  )
}
export function Activity_unpack_id(
  id: string
): { ctest_id: number; survey_id: number; group_id: number; custom_id?: number } {
  const components = Identifier_unpack(id)
  if (components[0] !== "Activity") throw new Error("400.invalid-identifier")
  const result = components.slice(1).map((x) => Number.parse(x) ?? 0)
  return {
    ctest_id: result[0],
    survey_id: result[1],
    group_id: result[2],
    custom_id: result.length > 3 ? result[3] : undefined,
  }
}
