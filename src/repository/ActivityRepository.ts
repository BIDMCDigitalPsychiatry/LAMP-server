import { SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Activity } from "../model/Activity"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { ActivitySpec } from "../model/ActivitySpec"
import { DurationIntervalLegacy } from "../model/Document"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { TypeRepository } from "../repository/TypeRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"
import { ActivityIndex } from "./migrate"
import { ActivitySpecRepository } from "./ActivitySpecRepository"

export class ActivityRepository {
  /**
   *
   */
  public static _pack_id(components: {
    /**
     *
     */
    ctest_id?: number

    /**
     *
     */
    survey_id?: number

    /**
     *
     */
    group_id?: number

    /**
     *
     */
    custom_id?: number
  }): string {
    return Identifier_pack(
      [
        (<any>Activity).name,
        components.ctest_id || 0,
        components.survey_id || 0,
        components.group_id || 0,
        components.custom_id || undefined,
      ].filter((x) => x !== undefined)
    )
  }

  /**
   *
   */
  public static _unpack_id(
    id: string
  ): {
    /**
     *
     */
    ctest_id: number

    /**
     *
     */
    survey_id: number

    /**
     *
     */
    group_id: number

    /**
     *
     */
    custom_id?: number
  } {
    const components = Identifier_unpack(id)
    if (components[0] !== (<any>Activity).name) throw new Error("400.invalid-identifier")
    const result = components.slice(1).map((x) => Number.parse(x) ?? 0)
    return {
      ctest_id: result[0],
      survey_id: result[1],
      group_id: result[2],
      custom_id: result.length > 3 ? result[3] : undefined,
    }
  }

  /**
   *
   */
  public static async _parent_id(id: string, type: Function): Promise<string | undefined> {
    const { ctest_id, survey_id, group_id, custom_id } = ActivityRepository._unpack_id(id)
    switch (type) {
      case StudyRepository:
      case ResearcherRepository:
        if (survey_id > 0 /* survey */) {
          const result = (
            await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Survey
						WHERE IsDeleted = 0 AND SurveyID = '${survey_id}'
					;`)
          ).recordset
          return result.length === 0
            ? undefined
            : (type === ResearcherRepository ? ResearcherRepository : StudyRepository)._pack_id({
                admin_id: result[0].value,
              })
        } else if (ctest_id > 0 /* ctest */) {
          const result = (
            await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Admin_CTestSettings
						WHERE Status = 1 AND AdminCTestSettingID = '${ctest_id}'
					;`)
          ).recordset
          return result.length === 0
            ? undefined
            : (type === ResearcherRepository ? ResearcherRepository : StudyRepository)._pack_id({
                admin_id: result[0].value,
              })
        } else if (group_id > 0 /* group */) {
          const result = (
            await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Admin_BatchSchedule
						WHERE IsDeleted = 0 AND AdminBatchSchID = '${ctest_id}'
					;`)
          ).recordset
          return result.length === 0
            ? undefined
            : (type === ResearcherRepository ? ResearcherRepository : StudyRepository)._pack_id({
                admin_id: result[0].value,
              })
        } else if (custom_id !== undefined /* custom */) {
          const result = (
            await SQL!.request().query(`
            SELECT ObjectID AS value
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
              [Key] = '${custom_id}'
              AND ObjectType = 'CustomActivity'
            )
					;`)
          ).recordset
          return result.length === 0
            ? undefined
            : type === StudyRepository
            ? result[0].value // Since we store actual string values, we need to re-pack them for Researcher...
            : ResearcherRepository._pack_id({
                admin_id: StudyRepository._unpack_id(result[0].value).admin_id,
              })
        } else return undefined
      default:
        throw new Error("400.invalid-identifier")
    }
  }

  /**
   * Get a set of `Activity`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string
  ): Promise<Activity[]> {
    // Get the correctly scoped identifier to search within.
    let ctest_id: number | undefined
    let survey_id: number | undefined
    let group_id: number | undefined
    let custom_id: number | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Activity).name) {
      const c = ActivityRepository._unpack_id(id)
      ctest_id = c.ctest_id
      survey_id = c.survey_id
      group_id = c.group_id
      custom_id = c.custom_id
    } else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      admin_id = ResearcherRepository._unpack_id((<any>await TypeRepository._parent(<string>id))["Researcher"]).admin_id
    else if (!!id) throw new Error("400.invalid-identifier")

    const resultBatch = (
      await SQL!.request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				AdminID AS aid,
				BatchName AS name, 
				('batch') AS type
			FROM Admin_BatchSchedule
      WHERE IsDeleted = 0 
        ${(ctest_id ?? 0) > 0 || (survey_id ?? 0) > 0 || (custom_id ?? 0) > 0 ? `AND 1=0` : ``}
				${group_id ?? 0 > 0 ? `AND AdminBatchSchID = '${group_id}'` : ``}
				${admin_id ?? 0 > 0 ? `AND AdminID = '${admin_id}'` : ``}
		;`)
    ).recordset
    const resultBatchCTestSettings = (
      await SQL!.request().query(`
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
      await SQL!.request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				SurveyID AS survey_id, 
				[Order] AS [order]
			FROM Admin_BatchScheduleSurvey
			WHERE AdminBatchSchID IN (${resultBatch.length === 0 ? "NULL" : resultBatch.map((x) => x.id).join(",")})
		;`)
    ).recordset
    const resultBatchSchedule = (
      await SQL!.request().query(`
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
      await SQL!.request().query(`
			SELECT 
				SurveyID AS id, 
				AdminID AS aid,
				SurveyName AS name, 
				('survey') AS type
			FROM Survey
			WHERE IsDeleted = 0 
        ${(ctest_id ?? 0) > 0 || (group_id ?? 0) > 0 || (custom_id ?? 0) > 0 ? `AND 1=0` : ``}
				${survey_id ?? 0 > 0 ? `AND SurveyID = '${survey_id}'` : ``}
				${admin_id ?? 0 > 0 ? `AND AdminID = '${admin_id}'` : ``}
		;`)
    ).recordset
    const resultSurveyQuestions = (
      await SQL!.request().query(`
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
      await SQL!.request().query(`
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
      await SQL!.request().query(`
      SELECT 
        AdminCTestSettingID AS id,
				AdminID AS aid,
        ('ctest') AS type,
        CTestID AS ctest_id
			FROM Admin_CTestSettings
      WHERE Status IN (1, NULL)
        AND CTestID NOT IN (4, 13)
        ${(survey_id ?? 0) > 0 || (group_id ?? 0) > 0 || (custom_id ?? 0) > 0 ? `AND 1=0` : ``}
				${ctest_id ?? 0 > 0 ? `AND AdminCTestSettingID = '${ctest_id}'` : ``}
				${admin_id ?? 0 > 0 ? `AND AdminID = '${admin_id}'` : ``}
		;`)
    ).recordset
    const resultTestJewelsSettings = (
      await SQL!.request().query(`
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
      await SQL!.request().query(`
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
    const resultCustom = (
      await SQL!.request().query(`
        SELECT [Key] AS custom_id, Value AS object
        FROM LAMP_Aux.dbo.OOLAttachment
        WHERE ObjectType = 'CustomActivity'
          ${(ctest_id ?? 0) > 0 || (group_id ?? 0) > 0 || (survey_id ?? 0) > 0 ? `AND 1=0` : ``}
          ${admin_id ?? 0 > 0 ? `AND ObjectID = '${StudyRepository._pack_id({ admin_id })}'` : ``}
    ;`)
    ).recordset
    // FIXME: Only works with Study IDs, not Researcher IDs, so multi-study Researcher-wide searches will fail!
    // FIXME: Shouldn't return deleted surveys/ctests in group settings.
    // FIXME: Should 404 error if nothing was found?

    return [...resultBatch, ...resultSurvey, ...resultTest, ...resultCustom].map((raw: any) => {
      const obj = new Activity()
      if (raw.type === "batch") {
        obj.id = ActivityRepository._pack_id({
          group_id: raw.id,
        })
        obj.spec = "lamp.group"
        obj.name = raw.name
        obj.settings = [
          ...resultBatchSurveySettings.filter((x) => x.id === raw.id),
          ...resultBatchCTestSettings.filter((x) => x.id === raw.id),
        ]
          .sort((x: any, y: any) => x.order - y.order)
          .map((x: any) =>
            ActivityRepository._pack_id({
              ctest_id: !x.ctest_id ? undefined : x.ctest_id,
              survey_id: !x.survey_id ? undefined : x.survey_id,
            })
          )
        obj.schedule = resultBatchSchedule
          .filter((x) => x.id === raw.id)
          .map((x) => ({
            ...x,
            id: undefined,
            custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t),
          })) as any
      } else if (raw.type === "survey") {
        obj.id = ActivityRepository._pack_id({
          survey_id: raw.id,
        })
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
        obj.id = ActivityRepository._pack_id({
          ctest_id: raw.id,
        })

        // FIXME: account for Forward/Backward variants that are not mapped!
        const specEntry = ActivityIndex.find((x) => x.LegacyCTestID === Number.parse(raw.ctest_id))
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
        obj.id = ActivityRepository._pack_id({ custom_id: raw.custom_id })
        obj.spec = raw.object.spec
        obj.name = raw.object.name
        obj.settings = raw.object.settings
        obj.schedule = raw.object.schedule
      }
      return obj
    })
  }

  /**
   * Create an `Activity` with a new object.
   */
  public static async _insert(
    /**
     * The parent Study's ID.
     */
    study_id: string,

    /**
     * The new object.
     */
    object: Activity
  ): Promise<string> {
    const { admin_id } = StudyRepository._unpack_id(study_id)
    const transaction = SQL!.transaction()
    await transaction.begin()
    try {
      // Set the deletion flag, without actually deleting the row.
      if (object.spec === "lamp.group" /* group */) {
        if (!Array.isArray(object.schedule) || object.schedule.length !== 1)
          throw new Error("400.duration-interval-not-specified")
        if (!Array.isArray(object.settings) || object.settings.length === 0)
          throw new Error("400.settings-not-specified")

        // Create the schedule.
        const result1 = await transaction.request().query(`
					INSERT INTO Admin_BatchSchedule (
						AdminID,
						BatchName,
						ScheduleDate,
						Time,
						RepeatID
					) 
					OUTPUT INSERTED.AdminBatchSchId
					VALUES ${object.schedule
            .map(
              (sched) => `(
						${admin_id}, 
						'${object.name ? _escapeMSSQL(object.name) : "new_group"}',
						'${sched.start_date}',
						'${sched.time}',
						${
              [
                "hourly",
                "every3h",
                "every6h",
                "every12h",
                "daily",
                "biweekly",
                "triweekly",
                "weekly",
                "bimonthly",
                "monthly",
                "custom",
                "none",
              ].indexOf(sched.repeat_interval) + 1
            }
					)`
            )
            .join(", ")}
				;`)
        if (result1.rowsAffected[0] !== object.schedule.length)
          throw new Error("400.create-failed-due-to-malformed-parameters-schedule")
        const batch_id = Number.parse(result1.recordset[0]["AdminBatchSchId"]) ?? -1

        const ctime = [].concat(
          ...object.schedule
            .map((x, idx) => [x.custom_time, idx])
            .filter((x) => !!x[0])
            .map((x) => x[0].map((y: any) => [y, x[1]]))
        )
        if (ctime.length > 0) {
          const result2 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleCustomTime (
							AdminBatchSchId,
							Time
						)
						VALUES ${ctime
              .map(
                (x) => `(
							${result1.recordset[x[1]]["AdminBatchSchId"]},
							'${x[0]}'
						)`
              )
              .join(", ")}
					;`)
          if (result2.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-timing")
        }

        // Get CTest spec list.
        const items = object.settings.map((x, idx) => ({ ...ActivityRepository._unpack_id(x), idx }))
        if (items.filter((x) => x.group_id > 0).length > 0) throw new Error("400.nested-objects-unsupported")

        // Create the CTest and Survey lists.
        const _ctest_select = (x_ctest_id: number): string =>
          `SELECT CTestID FROM Admin_CTestSettings WHERE AdminCTestSettingID = ${x_ctest_id} AND Status = 1`
        if (items.filter((x) => x.ctest_id > 0).length > 0) {
          const result3 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleCTest (AdminBatchSchID, CTestID, Version, [Order]) 
						VALUES ${items
              .filter((x) => x.ctest_id > 0)
              .map(
                (x) => `(
							${batch_id},
							(${_ctest_select(x.ctest_id)}),
							-1,
							${x.idx + 1}
						)`
              )
              .join(", ")}
					;`)
          if (result3.rowsAffected[0] !== items.filter((x) => x.ctest_id > 0).length)
            throw new Error("400.create-failed-due-to-malformed-parameters-settings")
        }
        if (items.filter((x) => x.survey_id > 0).length > 0) {
          // FIXME: Shouldn't be able to add deleted surveys.
          const result4 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleSurvey (AdminBatchSchID, SurveyID, [Order]) 
						VALUES ${items
              .filter((x) => x.survey_id > 0)
              .map(
                (x) => `(
							${batch_id},
							${x.survey_id},
							${x.idx + 1}
						)`
              )
              .join(", ")}
					;`)
          if (result4.rowsAffected[0] !== items.filter((x) => x.survey_id > 0).length)
            throw new Error("400.create-failed-due-to-malformed-parameters-settings")
        }

        // Return the new ID.
        await transaction.commit()
        return ActivityRepository._pack_id({
          group_id: batch_id,
        })
      } else if (object.spec === "lamp.survey" /* survey */) {
        const result1 = await transaction.request().query(`
					INSERT INTO Survey (AdminID, SurveyName) 
					OUTPUT INSERTED.SurveyID
					VALUES (${admin_id}, '${object.name ? _escapeMSSQL(object.name) : "new_survey"}')
				;`)
        if (result1.rowsAffected[0] === 0) throw new Error("400.create-failed")
        const survey_id = Number.parse(result1.recordset[0]["SurveyID"]) ?? -1

        // Create the questions.
        if (Array.isArray(object.settings) && object.settings.length > 0) {
          const result2 = await transaction.request().query(`
						INSERT INTO SurveyQuestions (
							SurveyID, QuestionText, AnswerType, 
							Threshold, Operator, Message
						) 
						OUTPUT INSERTED.QuestionID
						VALUES ${object.settings
              .map(
                (q) => `(
							${survey_id},
							'${_escapeMSSQL(q.text)}',
							${["likert", "list", "boolean", "clock", "years", "months", "days", "text"].indexOf(q.type) + 1},
							${_opMatch(q.text)?.tr ?? "NULL"},
							${_opMatch(q.text)?.op ?? "NULL"},
							${_opMatch(q.text)?.msg ?? "NULL"}
						)`
              )
              .join(", ")}
					;`)
          if (result2.rowsAffected[0] !== object.settings.length)
            throw new Error("400.create-failed-due-to-malformed-parameters-settings")

          const opts = [].concat(
            ...object.settings
              .map((x, idx) => [x.options, idx])
              .filter((x) => !!x[0])
              .map((x) => x[0].map((y: any) => [y, x[1]]))
          )
          if (opts.length > 0) {
            const result21 = await transaction.request().query(`
							INSERT INTO SurveyQuestionOptions (QuestionID, OptionText) 
							VALUES ${opts
                .map(
                  (q) => `(
								${result2.recordset[q[1]]["QuestionID"]},
								'${_escapeMSSQL(q[0])}'
							)`
                )
                .join(", ")}
						;`)
            if (result21.rowsAffected[0] !== opts.length)
              throw new Error("400.create-failed-due-to-malformed-parameters-settings")
          }
        }

        // Create the schedule.
        if (Array.isArray(object.schedule) && object.schedule.length > 0) {
          const result3 = await transaction.request().query(`
						INSERT INTO Admin_SurveySchedule (
							AdminID,
							SurveyID,
							ScheduleDate,
							Time,
							RepeatID
						) 
						OUTPUT INSERTED.AdminSurveySchId
						VALUES ${object.schedule
              .map(
                (sched) => `(
							${admin_id}, 
							${survey_id},
							'${sched.start_date}',
							'${sched.time}',
							${
                [
                  "hourly",
                  "every3h",
                  "every6h",
                  "every12h",
                  "daily",
                  "biweekly",
                  "triweekly",
                  "weekly",
                  "bimonthly",
                  "monthly",
                  "custom",
                  "none",
                ].indexOf(sched.repeat_interval) + 1
              }
						)`
              )
              .join(", ")}
					;`)
          if (result3.rowsAffected[0] !== object.schedule.length)
            throw new Error("400.create-failed-due-to-malformed-parameters-schedule")

          const ctime = [].concat(
            ...object.schedule
              .map((x, idx) => [x.custom_time, idx])
              .filter((x) => !!x[0])
              .map((x) => x[0].map((y: any) => [y, x[1]]))
          )
          if (ctime.length > 0) {
            const result4 = await transaction.request().query(`
							INSERT INTO Admin_SurveyScheduleCustomTime (
								AdminSurveySchId,
								Time
							)
							VALUES ${ctime
                .map(
                  (x) => `(
								${result3.recordset[x[1]]["AdminSurveySchId"]},
								'${x[0]}'
							)`
                )
                .join(", ")}
						;`)
            if (result4.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-timing")
          }
        }

        // Return the new ID.
        await transaction.commit()
        return ActivityRepository._pack_id({
          survey_id: survey_id,
        })
      } else if (ActivityIndex.map((x) => x.Name).includes(object.spec) /* ctest */) {
        const ctest_id = ActivityIndex.find((x) => x.Name === object.spec)?.LegacyCTestID ?? -1

        // First activate the CTest if previously inactive.
        const result = await transaction.request().query(`
					UPDATE Admin_CTestSettings 
					SET Status = 1 
          OUTPUT INSERTED.*, DELETED.*
					WHERE Status = 0
            AND AdminID = ${admin_id} 
            AND CTestID = ${ctest_id}
        ;`)
        if (result.rowsAffected[0] === 0) throw new Error("400.activity-exists-cannot-overwrite")
        const _actual_setting_id = Number.parse(result.recordset[0]["AdminCTestSettingID"]) ?? 0

        // Configure Jewels A or B if needed.
        if ((ctest_id === 17 || ctest_id === 18) && !!object.settings) {
          const isA = ctest_id === 17
          const result2 = await transaction.request().query(`
						MERGE Admin_JewelsTrails${isA ? "A" : "B"}Settings WITH (HOLDLOCK) AS Target
						USING (VALUES (${admin_id})) AS Source(AdminID)
							ON Target.AdminID = ${admin_id}
						WHEN MATCHED THEN
							UPDATE SET
								NoOfSeconds_Beg = ${object.settings.beginner_seconds || (isA ? 90 : 180)},
								NoOfSeconds_Int = ${object.settings.intermediate_seconds || (isA ? 30 : 90)},
								NoOfSeconds_Adv = ${object.settings.advanced_seconds || (isA ? 25 : 60)},
								NoOfSeconds_Exp = ${object.settings.expert_seconds || (isA ? 15 : 45)},
								NoOfDiamonds = ${object.settings.diamond_count || (isA ? 25 : 25)},
								NoOfShapes = ${object.settings.shape_count || (isA ? 1 : 2)},
								NoOfBonusPoints = ${object.settings.bonus_point_count || (isA ? 50 : 50)},
								X_NoOfChangesInLevel = ${object.settings.x_changes_in_level_count || (isA ? 1 : 1)},
								X_NoOfDiamonds = ${object.settings.x_diamond_count || (isA ? 1 : 1)},
								Y_NoOfChangesInLevel = ${object.settings.y_changes_in_level_count || (isA ? 1 : 1)},
								Y_NoOfShapes = ${object.settings.y_shape_count || (isA ? 1 : 2)}
						WHEN NOT MATCHED THEN
							INSERT (
								AdminID, NoOfSeconds_Beg, NoOfSeconds_Int, NoOfSeconds_Adv,
								NoOfSeconds_Exp, NoOfDiamonds, NoOfShapes, NoOfBonusPoints, 
								X_NoOfChangesInLevel, X_NoOfDiamonds, Y_NoOfChangesInLevel, 
								Y_NoOfShapes
							) VALUES (
								${admin_id},
								${object.settings.beginner_seconds || (isA ? 90 : 180)},
								${object.settings.intermediate_seconds || (isA ? 30 : 90)},
								${object.settings.advanced_seconds || (isA ? 25 : 60)},
								${object.settings.expert_seconds || (isA ? 15 : 45)},
								${object.settings.diamond_count || (isA ? 25 : 25)},
								${object.settings.shape_count || (isA ? 1 : 2)},
								${object.settings.bonus_point_count || (isA ? 50 : 50)},
								${object.settings.x_changes_in_level_count || (isA ? 1 : 1)},
								${object.settings.x_diamond_count || (isA ? 1 : 1)},
								${object.settings.y_changes_in_level_count || (isA ? 1 : 1)},
								${object.settings.y_shape_count || (isA ? 1 : 2)}
							)
					;`)
          if (result2.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-settings")
        }

        // Create the schedule.
        if (Array.isArray(object.schedule) && object.schedule.length > 0) {
          const result3 = await transaction.request().query(`
						INSERT INTO Admin_CTestSchedule (
							AdminID,
							CTestID,
							Version,
							ScheduleDate,
							Time,
							RepeatID
						) 
						OUTPUT INSERTED.AdminCTestSchId
						VALUES ${object.schedule
              .map(
                (sched) => `(
							${admin_id}, 
							${ctest_id},
							-1,
							'${sched.start_date}',
							'${sched.time}',
							${
                [
                  "hourly",
                  "every3h",
                  "every6h",
                  "every12h",
                  "daily",
                  "biweekly",
                  "triweekly",
                  "weekly",
                  "bimonthly",
                  "monthly",
                  "custom",
                  "none",
                ].indexOf(sched.repeat_interval) + 1
              }
						)`
              )
              .join(", ")}
					;`)
          if (result3.rowsAffected[0] !== object.schedule.length)
            throw new Error("400.create-failed-due-to-malformed-parameters-schedule")

          const ctime = [].concat(
            ...object.schedule
              .map((x, idx) => [x.custom_time, idx])
              .filter((x) => !!x[0])
              .map((x) => x[0].map((y: any) => [y, x[1]]))
          )
          if (ctime.length > 0) {
            const result4 = await transaction.request().query(`
							INSERT INTO Admin_CTestScheduleCustomTime (
								AdminCTestSchId,
								Time
							)
							VALUES ${ctime
                .map(
                  (x) => `(
								${result3.recordset[x[1]]["AdminCTestSchId"]},
								'${x[0]}'
							)`
                )
                .join(", ")}
						;`)
            if (result4.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-timing")
          }
        }

        // Return the new ID.
        await transaction.commit()
        return ActivityRepository._pack_id({
          ctest_id: _actual_setting_id,
        })
      } /* custom */ else {
        // Verify the parameters exist that we need to save.
        if (
          object.spec === undefined ||
          object.name === undefined ||
          object.settings === undefined ||
          object.schedule === undefined
        )
          throw new Error("400.create-failed-due-to-malformed-parameters")
        delete object.id

        const customSpecs = (await ActivitySpecRepository._select())
          .filter((x: any) => !ActivityIndex.map((y) => y.Name).includes(x.id) && x.id !== "lamp.group")
          .map((x: any) => x.id)
        if (!customSpecs.includes(object.spec)) throw new Error("400.no-such-activity-spec")

        // Create a new ID here which is just a random integer number.
        const _actual_custom_id = parseInt(Math.random().toFixed(10).slice(2, 12))

        // Actually insert the object.
        const req = SQL!.request()
        req.input("json_value", JSON.stringify(object))
        const result = await req.query(`
          INSERT INTO LAMP_Aux.dbo.OOLAttachment (
              ObjectType, ObjectID, [Key], Value
          )
          VALUES (
              'CustomActivity', '${study_id}', '${_actual_custom_id}', @json_value
          )
        ;`)
        if (result.rowsAffected[0] === 0) throw new Error("404.object-not-created")

        await transaction.commit()
        return ActivityRepository._pack_id({
          custom_id: _actual_custom_id,
        })
      }
    } catch (e) {
      await transaction.rollback()
      throw e
    }
    throw new Error("400.creation-failed")
  }

  /**
   * Update an `Activity` with new fields.
   */
  public static async _update(
    /**
     * The Activity's ID.
     */
    activity_id: string,

    /**
     * The object containing partial updating fields.
     */
    object: any
  ): Promise<{}> {
    const { ctest_id, survey_id, group_id, custom_id } = ActivityRepository._unpack_id(activity_id)

    if (typeof object.spec === "string") throw new Error("400.update-failed-modifying-activityspec-is-illegal")

    const transaction = SQL!.transaction()
    await transaction.begin()
    try {
      // Set the deletion flag, without actually deleting the row.
      if (group_id > 0 /* group */) {
        // Verify that the item exists.
        const result = await transaction.request().query(`
					SELECT AdminBatchSchID 
					FROM Admin_BatchSchedule 
					WHERE IsDeleted = 0
						AND AdminBatchSchID = ${group_id}
				;`)
        if (result.recordset.length === 0) throw new Error("404.object-not-found")

        // Modify batch schedule and name.
        if (Array.isArray(object.schedule) || typeof object.name === "string") {
          if (Array.isArray(object.schedule) && object.schedule.length !== 1)
            throw new Error("400.empty-duration-unsupported")

          const result1 = await transaction.request().query(`
						UPDATE Admin_BatchSchedule SET 
							${[
                !!object.name ? `BatchName = '${object.name}'` : null,
                !!object.schedule[0].start_date ? `ScheduleDate = '${object.schedule[0].start_date}'` : null,
                !!object.schedule[0].time ? `Time = '${object.schedule[0].time}'` : null,
                !!object.schedule[0].repeat_interval
                  ? `RepeatID = ${
                      [
                        "hourly",
                        "every3h",
                        "every6h",
                        "every12h",
                        "daily",
                        "biweekly",
                        "triweekly",
                        "weekly",
                        "bimonthly",
                        "monthly",
                        "custom",
                        "none",
                      ].indexOf(object.schedule[0].repeat_interval) + 1
                    }`
                  : null,
              ]
                .filter((x) => x !== null)
                .join(", ")}
						WHERE IsDeleted = 0
							AND AdminBatchSchID = ${group_id}
					;`)

          // Modify custom times.
          if (Array.isArray(object.schedule[0].custom_time)) {
            const ctime = object.schedule[0].custom_time
            const result2 = await transaction.request().query(`
							MERGE INTO Admin_BatchScheduleCustomTime Target
							USING (VALUES
								${ctime.length === 0 ? "(NULL, NULL)" : ctime.map((x: any) => `(${group_id}, '${_escapeMSSQL(x)}')`).join(", ")}
							) AS Source(AdminBatchSchID, Time)
								ON Target.AdminBatchSchID = Source.AdminBatchSchID 
								AND Target.Time = Source.Time
							WHEN NOT MATCHED BY Target THEN
								INSERT (AdminBatchSchID, Time) 
								VALUES (Source.AdminBatchSchID, Source.Time)
							WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${group_id} THEN 
								DELETE
							OUTPUT $ACTION, INSERTED.*, DELETED.*
						;`)
          }
        }

        // Modify batch settings.
        if (Array.isArray(object.settings)) {
          const items = (object.settings as Array<string>).map((x, idx) => ({
            ...ActivityRepository._unpack_id(x),
            idx,
          }))

          if (items.filter((x) => x.group_id > 0).length > 0) throw new Error("400.nested-activity-groups-unsupported")
          if (items.filter((x) => x.group_id === 0).length === 0)
            throw new Error("400.empty-activity-group-settings-array-unsupported")
          const ctest = items.filter((x) => x.ctest_id > 0)
          const survey = items.filter((x) => x.survey_id > 0)

          // FIXME: confirm survey/ctest not deleted first + exists!

          const _ctest_select = `SELECT CTestID FROM Admin_CTestSettings WHERE AdminCTestSettingID = ${ctest_id}`
          const result3 = await transaction.request().query(`
						MERGE INTO Admin_BatchScheduleCTest Target
						USING (VALUES
							${
                ctest.length === 0
                  ? "(NULL, NULL, NULL)"
                  : ctest.map((x) => `(${group_id}, (${_ctest_select}), ${x.idx + 1})`).join(", ")
              }
						) AS Source(AdminBatchSchID, CTestID, [Order])
							ON Target.AdminBatchSchID = Source.AdminBatchSchID 
							AND Target.CTestID = Source.CTestID
							AND Target.[Order] = Source.[Order]
							AND Source.AdminBatchSchID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (AdminBatchSchID, CTestID, Version, [Order]) 
							VALUES (Source.AdminBatchSchID, Source.CTestID, -1, Source.[Order])
						WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${group_id} THEN 
							DELETE
						OUTPUT $ACTION, INSERTED.*, DELETED.*
					;`)

          const result4 = await transaction.request().query(`
						MERGE INTO Admin_BatchScheduleSurvey Target
						USING (VALUES
							${
                survey.length === 0
                  ? "(NULL, NULL, NULL)"
                  : survey.map((x: any) => `(${group_id}, ${x.survey_id}, ${x.idx + 1})`).join(", ")
              }
						) AS Source(AdminBatchSchID, SurveyID, [Order])
							ON Target.AdminBatchSchID = Source.AdminBatchSchID 
							AND Target.SurveyID = Source.SurveyID
							AND Target.[Order] = Source.[Order]
							AND Source.AdminBatchSchID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (AdminBatchSchID, SurveyID, [Order]) 
							VALUES (Source.AdminBatchSchID, Source.SurveyID, Source.[Order])
						WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${group_id} THEN 
							DELETE
						OUTPUT $ACTION, INSERTED.*, DELETED.*
					;`)
        }

        await transaction.commit()
        return {}
      } else if (survey_id > 0 /* survey */) {
        // Modify survey name or verify that the item exists.
        if (typeof object.name === "string") {
          const result0 = await transaction.request().query(`
						UPDATE Survey SET 
							SurveyName = '${_escapeMSSQL(object.name)}'
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
          if (result0.rowsAffected[0] === 0) throw new Error("404.object-not-found")
        } else {
          const result0 = await transaction.request().query(`
						SELECT SurveyID 
						FROM Survey 
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
          if (result0.recordset.length === 0) throw new Error("404.object-not-found")
        }

        // Modify survey schedule.
        if (Array.isArray(object.schedule)) {
          const result2 = await transaction.request().query(`
						UPDATE Admin_SurveySchedule 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
          if (object.schedule.length > 0) {
            const result3 = await transaction.request().query(`
							INSERT INTO Admin_SurveySchedule (
								AdminID,
								SurveyID,
								ScheduleDate,
								Time,
								RepeatID
							) 
							OUTPUT INSERTED.AdminSurveySchId
							VALUES ${object.schedule
                .map(
                  (sched: any) => `(
								(
                  SELECT AdminID
                  FROM Survey
                  WHERE SurveyID = ${survey_id}
							  ),
								${survey_id},
								'${sched.start_date}',
								'${sched.time}',
								${
                  [
                    "hourly",
                    "every3h",
                    "every6h",
                    "every12h",
                    "daily",
                    "biweekly",
                    "triweekly",
                    "weekly",
                    "bimonthly",
                    "monthly",
                    "custom",
                    "none",
                  ].indexOf(sched.repeat_interval) + 1
                }
							)`
                )
                .join(", ")}
						;`)
            if (result3.rowsAffected[0] !== object.schedule.length)
              throw new Error("400.create-failed-due-to-malformed-parameters-schedule")

            const ctime = [].concat(
              ...object.schedule
                .map((x: any, idx: number) => [x.custom_time, idx])
                .filter((x: any) => !!x[0])
                .map((x: any) => x[0].map((y: any) => [y, x[1]]))
            )
            if (ctime.length > 0) {
              const result4 = await transaction.request().query(`
								INSERT INTO Admin_SurveyScheduleCustomTime (
									AdminSurveySchId,
									Time
								)
								VALUES ${ctime
                  .map(
                    (x) => `(
									${result3.recordset[x[1]]["AdminSurveySchId"]},
									'${x[0]}'
								)`
                  )
                  .join(", ")}
							;`)
              if (result4.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-timing")
            }
          }
        }

        // Modify survey questions.
        if (Array.isArray(object.settings)) {
          const result3 = await transaction.request().query(`
						UPDATE SurveyQuestions 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
          if (object.settings.length > 0) {
            const result2 = await transaction.request().query(`
							INSERT INTO SurveyQuestions (SurveyID, QuestionText, AnswerType) 
							OUTPUT INSERTED.QuestionID
							VALUES ${object.settings
                .map(
                  (q: any) => `(
								${survey_id},
								'${_escapeMSSQL(q.text)}',
								${["likert", "list", "boolean", "clock", "years", "months", "days", "text"].indexOf(q.type) + 1}
							)`
                )
                .join(", ")}
						;`)
            if (result2.rowsAffected[0] !== object.settings.length)
              throw new Error("400.create-failed-due-to-malformed-parameters-settings")

            const opts = [].concat(
              ...object.settings
                .map((x: any, idx: number) => [x.options, idx])
                .filter((x: any) => !!x[0])
                .map((x: any) => x[0].map((y: any) => [y, x[1]]))
            )
            if (opts.length > 0) {
              const result21 = await transaction.request().query(`
								INSERT INTO SurveyQuestionOptions (QuestionID, OptionText) 
								VALUES ${opts
                  .map(
                    (q) => `(
									${result2.recordset[q[1]]["QuestionID"]},
									'${_escapeMSSQL(q[0])}'
								)`
                  )
                  .join(", ")}
							;`)
              if (result21.rowsAffected[0] !== opts.length)
                throw new Error("400.create-failed-due-to-malformed-parameters-settings")
            }
          }
        }

        await transaction.commit()
        return {}
      } else if (ActivityIndex.map((x) => x.Name).includes(object.spec) /* ctest */) {
        // Verify that the item exists.
        const result = await transaction.request().query(`
					SELECT AdminID, CTestID 
					FROM Admin_CTestSettings 
					WHERE Status = 1
						AND AdminCTestSettingID = ${ctest_id}
				;`)
        if (result.recordset.length === 0) throw new Error("404.object-not-found")

        // Modify ctest schedule.
        if (Array.isArray(object.schedule)) {
          const result2 = await transaction.request().query(`
						UPDATE Admin_CTestSchedule 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND AdminID IN (
								SELECT AdminID
								FROM Admin_CTestSettings
								WHERE AdminCTestSettingID = ${ctest_id}
							)
							AND CTestID IN (
								SELECT CTestID
								FROM Admin_CTestSettings
								WHERE AdminCTestSettingID = ${ctest_id}
							)
					;`)
          if (object.schedule.length > 0) {
            const result3 = await transaction.request().query(`
							INSERT INTO Admin_CTestSchedule (
								AdminID,
								CTestID,
								Version,
								ScheduleDate,
								Time,
								RepeatID
							) 
							OUTPUT INSERTED.AdminCTestSchId
							VALUES ${object.schedule
                .map(
                  (sched: any) => `(
								(
                  SELECT AdminID
                  FROM Admin_CTestSettings
                  WHERE AdminCTestSettingID = ${ctest_id}
							  ), 
								(
                  SELECT CTestID
                  FROM Admin_CTestSettings
                  WHERE AdminCTestSettingID = ${ctest_id}
							  ), 
								-1,
								'${sched.start_date}',
								'${sched.time}',
								${
                  [
                    "hourly",
                    "every3h",
                    "every6h",
                    "every12h",
                    "daily",
                    "biweekly",
                    "triweekly",
                    "weekly",
                    "bimonthly",
                    "monthly",
                    "custom",
                    "none",
                  ].indexOf(sched.repeat_interval) + 1
                }
							)`
                )
                .join(", ")}
						;`)
            if (result3.rowsAffected[0] !== object.schedule.length)
              throw new Error("400.create-failed-due-to-malformed-parameters-schedule")

            const ctime = [].concat(
              ...object.schedule
                .map((x: any, idx: number) => [x.custom_time, idx])
                .filter((x: any) => !!x[0])
                .map((x: any) => x[0].map((y: any) => [y, x[1]]))
            )
            if (ctime.length > 0) {
              const result4 = await transaction.request().query(`
								INSERT INTO Admin_CTestScheduleCustomTime (
									AdminCTestSchId,
									Time
								)
								VALUES ${ctime
                  .map(
                    (x) => `(
									${result3.recordset[x[1]]["AdminCTestSchId"]},
									'${x[0]}'
								)`
                  )
                  .join(", ")}
							;`)
              if (result4.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-timing")
            }
          }
        }

        // Modify jewels ctest questions.
        const checkJewels = await transaction.request().query(`
            SELECT AdminID, CTestID 
            FROM Admin_CTestSettings
            WHERE AdminCTestSettingID = ${ctest_id}
          ;`)
        const adminID = Number.parse(checkJewels.recordset[0]["AdminID"]) ?? 0
        const actualID = Number.parse(checkJewels.recordset[0]["CTestID"]) ?? 0
        if (typeof object.settings === "object" && (actualID === 17 || actualID === 18)) {
          const isA = actualID === 17
          const result2 = await transaction.request().query(`
						UPDATE Admin_JewelsTrails${isA ? "A" : "B"}Settings SET
							NoOfSeconds_Beg = ${object.settings.beginner_seconds || (isA ? 90 : 180)},
							NoOfSeconds_Int = ${object.settings.intermediate_seconds || (isA ? 30 : 90)},
							NoOfSeconds_Adv = ${object.settings.advanced_seconds || (isA ? 25 : 60)},
							NoOfSeconds_Exp = ${object.settings.expert_seconds || (isA ? 15 : 45)},
							NoOfDiamonds = ${object.settings.diamond_count || (isA ? 25 : 25)},
							NoOfShapes = ${object.settings.shape_count || (isA ? 1 : 2)},
							NoOfBonusPoints = ${object.settings.bonus_point_count || (isA ? 50 : 50)},
							X_NoOfChangesInLevel = ${object.settings.x_changes_in_level_count || (isA ? 1 : 1)},
							X_NoOfDiamonds = ${object.settings.x_diamond_count || (isA ? 1 : 1)},
							Y_NoOfChangesInLevel = ${object.settings.y_changes_in_level_count || (isA ? 1 : 1)},
							Y_NoOfShapes = ${object.settings.y_shape_count || (isA ? 1 : 2)}
						WHERE Admin_JewelsTrails${isA ? "A" : "B"}Settings.AdminID = ${adminID}
					;`)
          if (result2.rowsAffected[0] === 0) throw new Error("400.create-failed-due-to-malformed-parameters-settings")
        }

        await transaction.commit()
        return {}
      } /* custom */ else {
        // Verify the parameters exist that we need to save.
        if (
          custom_id === undefined ||
          //object.id === undefined ||
          //object.spec === undefined ||
          object.name === undefined ||
          object.settings === undefined ||
          object.schedule === undefined
        )
          throw new Error("400.update-failed-incomplete-object")
        delete object.id

        // We need to grab the existing copy to migrate the old spec == new spec.
        const existing = (
          await SQL!.request().query(`
            SELECT Value AS object
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE ObjectType = 'CustomActivity'
              AND [Key] = '${custom_id}'
        ;`)
        ).recordset
        object.spec = JSON.parse(existing[0].object).spec

        // Save the JSON. Note, we are NOT checking against ObjectID to see if the owner is the same.
        const req = SQL!.request()
        req.input("json_value", JSON.stringify(object))
        const result = await req.query(`
          UPDATE LAMP_Aux.dbo.OOLAttachment SET
            Value = @json_value
          WHERE ObjectType = 'CustomActivity'
            AND [Key] = '${custom_id}'
        ;`)
        if (result.rowsAffected[0] === 0) throw new Error("404.object-not-found")

        await transaction.commit()
        return {}
      }
    } catch (e) {
      await transaction.rollback()
      throw e
    }
    throw new Error("400.update-failed")
  }

  /**
   * Delete an `Activity` row.
   */
  public static async _delete(
    /**
     * The Activity's ID.
     */
    activity_id: string
  ): Promise<{}> {
    const { ctest_id, survey_id, group_id, custom_id } = ActivityRepository._unpack_id(activity_id)
    const transaction = SQL!.transaction()
    await transaction.begin()
    try {
      // Set the deletion flag, without actually deleting the row.
      if (group_id > 0 /* group */) {
        const result = await transaction.request().query(`
					UPDATE Admin_BatchSchedule 
					SET IsDeleted = 1 
					WHERE IsDeleted = 0
						AND AdminBatchSchID = ${group_id}
				;`)
        if (result.rowsAffected[0] === 0) throw new Error("404.object-not-found")
      } else if (survey_id > 0 /* survey */) {
        const result = await transaction.request().query(`
					UPDATE Survey 
					SET IsDeleted = 1 
					WHERE IsDeleted = 0 
						AND SurveyID = ${survey_id}
				;`)
        if (result.rowsAffected[0] === 0) throw new Error("404.object-not-found")

        const result2 = await transaction.request().query(`
					UPDATE Admin_SurveySchedule 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND SurveyID = ${survey_id}
				;`)

        const result3 = await transaction.request().query(`
					UPDATE SurveyQuestions 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND SurveyID = ${survey_id}
				;`)
      } else if (ctest_id > 0 /* ctest */) {
        const result1 = await transaction.request().query(`
					UPDATE Admin_CTestSettings 
					SET Status = 0 
					WHERE Status = 1
						AND AdminCTestSettingID = ${ctest_id}
				;`)
        if (result1.rowsAffected[0] === 0) throw new Error("404.object-not-found")

        const result2 = await transaction.request().query(`
					UPDATE Admin_CTestSchedule 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND AdminID IN (
							SELECT AdminID
							FROM Admin_CTestSettings
							WHERE AdminCTestSettingID = ${ctest_id}
						)
						AND CTestID IN (
							SELECT CTestID
							FROM Admin_CTestSettings
							WHERE AdminCTestSettingID = ${ctest_id}
						)
				;`)
      } /* custom */ else {
        // Verify the parameters exist that we need to save.
        if (custom_id === undefined) throw new Error("400.delete-invalid-identifier")

        // Delete the internal attachment. WE ARE NOT CHECKING OWNERSHIP!
        const result = await SQL!.request().query(`
          DELETE FROM LAMP_Aux.dbo.OOLAttachment
            WHERE 
                [Key] = '${custom_id}'
                AND ObjectType = 'CustomActivity'
        ;`)
        if (result.rowsAffected[0] === 0) throw new Error("404.access-key-not-found")
      }

      await transaction.commit()
      return {}
    } catch (e) {
      await transaction.rollback()
      throw e
    }
    throw new Error("400.delete-failed")
  }
}

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

// threshold & operator hard-coded matches
const _opMatch = (val: string) =>
  (<any>{
    "Today I have thoughts of self-harm": {
      tr: 1,
      op: `'1'`,
      msg: `'Please remember that this app is not monitored.  If you are having thoughts of suicide or self-harm, please call 1-800-273-8255.'`,
    },
  })[val]

/**
 * Produce the internal-only Jewels A/B settings mappings.
 * Note: this is not to be exposed externally as an API.
 *
 * The column map specifies the LAMP object key to DB row column mapping.
 * The default map specifies the LAMP object's value if none is found.
 */
function jewelsMap(
  /**
   * The settings key to produce detail on.
   */
  key: string,

  /**
   * Either false for column mapping, or true for defaults mapping.
   */
  variety = false
) {
  return (<any>(!variety
    ? {
        beginner_seconds: "NoOfSeconds_Beg",
        intermediate_seconds: "NoOfSeconds_Int",
        advanced_seconds: "NoOfSeconds_Adv",
        expert_seconds: "NoOfSeconds_Exp",
        diamond_count: "NoOfDiamonds",
        shape_count: "NoOfShapes",
        bonus_point_count: "NoOfBonusPoints",
        x_changes_in_level_count: "X_NoOfChangesInLevel",
        x_diamond_count: "X_NoOfDiamonds",
        y_changes_in_level_count: "Y_NoOfChangesInLevel",
        y_shape_count: "Y_NoOfShapes",
      }
    : {
        beginner_seconds: 0,
        intermediate_seconds: 0,
        advanced_seconds: 0,
        expert_seconds: 0,
        diamond_count: 0,
        shape_count: 0,
        bonus_point_count: 0,
        x_changes_in_level_count: 0,
        x_diamond_count: 0,
        y_changes_in_level_count: 0,
        y_shape_count: 0,
      }))[key]
}
