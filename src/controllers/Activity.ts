import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Type } from './Type'
import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'
import { ActivitySpec } from './ActivitySpec'
import { DurationIntervalLegacy } from './Document'

@Schema()
@Parent(Study)
@Description(d`
	An activity that may be performed by a participant in a study.
`)
export class Activity {

	@Property()
	@Description(d`
		The self-referencing identifier to this object.
	`)
	public id?: Identifier

	@Property()
	@Description(d`
		The specification, parameters, and type of the activity.
	`)
	public spec?: Identifier

	@Property()
	@Description(d`
		The name of the activity.
	`)
	public name?: string

	@Property()
	@Description(d`
		The notification schedule for the activity.
	`)
	public schedule?: DurationIntervalLegacy

	@Property()
	@Description(d`
		The configuration settings for the activity.
	`)
	public settings?: any

	@Route.POST('/study/{study_id}/activity') 
	@Description(d`
		Create a new Activity under the given Study.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Identifier, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string,

		@Body()
		activity: Activity,

	): Promise<Identifier> {
		return Activity._insert(study_id, activity)
	}

	@Route.PUT('/activity/{activity_id}') 
	@Description(d`
		Update an Activity's settings.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'activity_id')
	@Retype(Identifier, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('activity_id')
		@Retype(Identifier, Activity)
		activity_id: string,

		@Body()
		activity: Activity,

	): Promise<{}> {
		return Activity._update(activity_id, activity)
	}

	@Route.DELETE('/activity/{activity_id}') 
	@Description(d`
		Delete an Activity.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'activity_id')
	@Retype(Identifier, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('activity_id')
		@Retype(Identifier, Activity)
		activity_id: string

	): Promise<{}> {
		return Activity._delete(activity_id)
	}

	@Route.GET('/activity/{activity_id}') 
	@Description(d`
		Get a single activity, by identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'activity_id')
	@Retype(Array, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('activity_id')
		@Retype(Identifier, Activity)
		activity_id: string

	): Promise<Activity[]> {
		return Activity._select(activity_id)
	}

	@Route.GET('/participant/{participant_id}/activity') 
	@Description(d`
		Get the set of all activities available to a participant, 
		by participant identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'participant_id')
	@Retype(Array, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_participant(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string

	): Promise<Activity[]> {
		return Activity._select(participant_id)
	}

	@Route.GET('/study/{study_id}/activity') 
	@Description(d`
		Get the set of all activities available to 
		participants of a single study, by study identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Array, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_study(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string

	): Promise<Activity[]> {
		return Activity._select(study_id)
	}

	@Route.GET('/researcher/{researcher_id}/activity') 
	@Description(d`
		Get the set of all activities available to participants 
		of any study conducted by a researcher, by researcher identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Array, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_researcher(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<Activity[]> {
		return Activity._select(researcher_id)
	}

	@Route.GET('/activity') 
	@Description(d`
		Get the set of all activities.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, Activity)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<Activity[]> {
		return Activity._select()
	}

	/**
	 *
	 */
	public static _pack_id(components: {

		/**
		 * 
		 */
		activity_spec_id?: number

		/**
		 * 
		 */
		admin_id?: number

		/**
		 * 
		 */
		survey_id?: number

	}): Identifier {
		return Identifier.pack([
			(<any>Activity).name, 
			components.activity_spec_id || 0, 
			components.admin_id || 0, 
			components.survey_id || 0
		])
	}

	/**
	 *
	 */
	public static _unpack_id(id: Identifier): ({

		/**
		 * 
		 */
		activity_spec_id: number

		/**
		 * 
		 */
		admin_id: number

		/**
		 * 
		 */
		survey_id: number

	}) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>Activity).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			activity_spec_id: !isNaN(result[0]) ? result[0] : 0,
			admin_id: !isNaN(result[1]) ? result[1] : 0,
			survey_id: !isNaN(result[2]) ? result[2] : 0,
		}
	}

	/**
	 *
	 */
	public static async _parent_id(id: Identifier, type: Function): Promise<Identifier | undefined> {
		let { activity_spec_id, admin_id, survey_id } = Activity._unpack_id(id)
		switch (type) {
			case Study:
			case Researcher: 
				if (activity_spec_id === 1 /* survey */) {
					let result = (await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Survey
						WHERE IsDeleted = 0 AND SurveyID = '${survey_id}'
					;`)).recordset
					return result.length === 0 ? undefined :
						(type === Researcher ? Researcher : Study)._pack_id({ admin_id: result[0].value })
				} else {

					// Only "Survey" types lack an encoded AdminID; regardless, verify their deletion.
					let result = (await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Admin
						WHERE IsDeleted = 0 AND AdminID = '${admin_id}'
					;`)).recordset
					return result.length === 0 ? undefined :
						(type === Researcher ? Researcher : Study)._pack_id({ admin_id: result[0].value })
				}
			default: throw new Error()
		}
	}

	// FIXME: Use AdminCTestSettings for CTest ID

	/**
	 * Get a set of `Activity`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * 
		 */
		id?: Identifier, 

	): Promise<Activity[]> {

		// Get the correctly scoped identifier to search within.
		let ctest_id: number | undefined
		let survey_id: number | undefined
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Study).name)
			admin_id = Study._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Activity).name) {
			let c = Activity._unpack_id(id)
			ctest_id = c.activity_spec_id
			survey_id = c.survey_id
			admin_id = c.admin_id
		} 
		else if (!!id && Identifier.unpack(id).length === 0 /* Participant */)
			admin_id = Researcher._unpack_id((<any>await Type.parent(<string>id))['Researcher']).admin_id
		else if(!!id) throw new Error()

		let resultBatch = (await SQL!.request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				AdminID AS aid,
				BatchName AS name, 
				('batch') AS type
			FROM Admin_BatchSchedule
			WHERE IsDeleted = 0 
				${!ctest_id ? '' : (ctest_id === 0 /* batch */ ? '' : `AND 1=0`)}
				${!survey_id ? '' : `AND AdminBatchSchID = '${survey_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
		;`)).recordset
		let resultBatchCTestSettings = (await SQL!.request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				ActivityIndexID AS ctest_id,
				Version AS version, 
				[Order] AS [order]
			FROM Admin_BatchScheduleCTest
			JOIN LAMP_Aux.dbo.ActivityIndex
				ON LegacyCTestID = CTestID
			WHERE AdminBatchSchID IN (${resultBatch.map(x => x.id).join(',')})
		;`)).recordset
		let resultBatchSurveySettings = (await SQL!.request().query(`
			SELECT 
				AdminBatchSchID AS id, 
				SurveyID AS survey_id, 
				[Order] AS [order]
			FROM Admin_BatchScheduleSurvey
			WHERE AdminBatchSchID IN (${resultBatch.map(x => x.id).join(',')})
		;`)).recordset
		let resultBatchSchedule = (await SQL!.request().query(`
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
				AND AdminBatchSchID IN (${resultBatch.map(x => x.id).join(',')})
		;`)).recordset
		let resultSurvey = (await SQL!.request().query(`
			SELECT 
				SurveyID AS id, 
				AdminID AS aid,
				SurveyName AS name, 
				('survey') AS type
			FROM Survey
			WHERE isDeleted = 0 
				${!ctest_id ? '' : (ctest_id === 1 /* survey */  ? '' : `AND 1=0`)}
				${!survey_id ? '' : `AND SurveyID = '${survey_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
		;`)).recordset
		let resultSurveyQuestions = (await SQL!.request().query(`
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
					AND SurveyID IN (${resultSurvey.map(x => x.id).join(',')})
		;`)).recordset
		let resultSurveySchedule = (await SQL!.request().query(`
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
				AND Admin_SurveySchedule.SurveyID IN (${resultSurvey.map(x => x.id).join(',')})
		;`)).recordset
		let resultTest = (await SQL!.request().query(`
			SELECT 
				Admin.AdminID AS aid,
				('ctest') AS type,
				CTest.*
			FROM Admin
			CROSS APPLY 
			(
				SELECT 
					ActivityIndexID AS id,
					LegacyCTestID AS lid,
					Name AS name
				FROM LAMP_Aux.dbo.ActivityIndex
				WHERE LegacyCTestID IS NOT NULL
			) AS CTest
			JOIN Admin_CTestSettings
				ON Admin_CTestSettings.AdminID = Admin.AdminID
				AND Admin_CTestSettings.CTestID = CTest.lid
			WHERE isDeleted = 0 
				AND Status IN (1, NULL)
				${!ctest_id ? '' : `AND CTest.id = '${ctest_id}'`}
				${!admin_id ? '' : `AND Admin.AdminID = '${admin_id}'`}
		;`)).recordset
		let resultTestJewelsSettings = (await SQL!.request().query(`
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
			WHERE Admin_JewelsTrailsASettings.AdminID IN (${resultTest.map(x => x.aid).join(',')})
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
			WHERE Admin_JewelsTrailsBSettings.AdminID IN (${resultTest.map(x => x.aid).join(',')})
		;`)).recordset
		let resultTestSchedule = (await SQL!.request().query(`
			SELECT
				CTestID as lid,
				AdminID AS aid, 
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
			WHERE IsDeleted = 0 
				AND CONCAT('', CTestID, AdminID) IN (${resultTest.map(x => `'${x.lid}${x.aid}'`).join(',')})
		;`)).recordset

		// FIXME: Shouldn't return deleted surveys/ctests in group settings.

		return [...resultBatch, ...resultSurvey, ...resultTest].map((raw: any) => {
			let obj = new Activity()
			if (raw.type === 'batch') {
				obj.id = Activity._pack_id({
					activity_spec_id: 0 /* batch */,
					admin_id: raw.aid,
					survey_id: raw.id
				})
				obj.spec = 'lamp.group'
				obj.name = raw.name
				obj.settings = [
						...resultBatchSurveySettings.filter(x => x.id === raw.id), 
						...resultBatchCTestSettings.filter(x => x.id === raw.id)
					]
					.sort((x: any, y: any) => x.order - y.order)
					.map((x: any) => Activity._pack_id({
						activity_spec_id: !x.survey_id ? x.ctest_id : 1 /* survey */,
						admin_id: raw.aid,
						survey_id: !x.survey_id ? undefined : x.survey_id
					}))
				obj.schedule = resultBatchSchedule
						.filter(x => x.id === raw.id)
						.map(x => ({ ...x, id: undefined, 
							custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t) 
						})) as any
			} else if (raw.type === 'survey') {
				obj.id = Activity._pack_id({
					activity_spec_id: 1 /* survey */,
					admin_id: raw.aid,
					survey_id: raw.id
				})
				obj.spec = 'lamp.survey'
				obj.name = raw.name
				obj.settings = resultSurveyQuestions
						.filter(x => x.id === raw.id)
						.map(x => ({ ...x, id: undefined, 
							options: !x.options ? null : JSON.parse(x.options).map((y: any) => y.opt) 
						})) as any
				obj.schedule = resultSurveySchedule
						.filter(x => x.id === raw.id)
						.map(x => ({ ...x, id: undefined, 
							custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t) 
						})) as any
			} else if (raw.type === 'ctest') {
				obj.id = Activity._pack_id({
					activity_spec_id: raw.id,
					admin_id: raw.aid,
					//survey_id: raw.id
				})
				obj.spec = raw.name
				obj.name = spec_map[(<string>raw.name)]
				if (raw.name === 'lamp.jewels_a') {
					obj.settings = resultTestJewelsSettings
							.filter(x => x.type === 'a')
							.map(x => ({ ...x, type: undefined }))[0] as any
				} else if (raw.name === 'lamp.jewels_b') {
					obj.settings = resultTestJewelsSettings
							.filter(x => x.type === 'b')
							.map(x => ({ ...x, type: undefined }))[0] as any
				} else obj.settings = {}
				obj.schedule = resultTestSchedule
						.filter(x => x.aid == raw.aid && x.lid == raw.lid)
						.map(x => ({ ...x, aid: undefined, lid: undefined, 
							custom_time: !x.custom_time ? null : JSON.parse(x.custom_time).map((y: any) => y.t) 
						})) as any
			}
			return obj
		})
	}

	/**
	 * Create an `Activity` with a new object.
	 */
	private static async _insert(

		/**
		 * The parent Study's ID.
		 */
		study_id: Identifier,

		/**
		 * The new object.
		 */
		object: Activity

	): Promise<Identifier> {

		let { admin_id } = Study._unpack_id(study_id)
		let transaction = SQL!.transaction()
		await transaction.begin()
		try {

			// Set the deletion flag, without actually deleting the row.
			if (object.spec === 'lamp.group' /* group */) {
				if (!Array.isArray(object.schedule) || object.schedule.length !== 1)
					throw new Error('This ActivitySpec requires a schedule of exactly one DurationInterval.')
				if (!Array.isArray(object.settings) || object.settings.length === 0)
					throw new Error('This ActivitySpec requires settings of a non-zero length array.')

				// Create the schedule.
				let result1 = await transaction.request().query(`
					INSERT INTO Admin_BatchSchedule (
						AdminID,
						BatchName,
						ScheduleDate,
						Time,
						RepeatID
					) 
					OUTPUT INSERTED.AdminBatchSchId
					VALUES ${object.schedule.map(sched => `(
						${admin_id}, 
						'${object.name ? _escapeMSSQL(object.name) : 'new_group'}',
						'${sched.start_date}',
						'${sched.time}',
						${[
							'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
							'biweekly', 'triweekly', 'weekly', 'bimonthly', 
							'monthly', 'custom', 'none'
						].indexOf(sched.repeat_interval) + 1}
					)`).join(', ')}
				;`)
				if (result1.rowsAffected[0] !== object.schedule.length)
					throw new Error('Could not create Activity due to malformed schedule.')
				let batch_id = result1.recordset[0]['AdminBatchSchId']

				let ctime = [].concat(...object.schedule
											   .map((x, idx) => [x.custom_time, idx])
											   .filter(x => !!x[0])
											   .map(x => x[0].map((y: any) => [y, x[1]])))
				if (ctime.length > 0) {
					let result2 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleCustomTime (
							AdminBatchSchId,
							Time
						)
						VALUES ${ctime.map(x => `(
							${result1.recordset[x[1]]['AdminBatchSchId']},
							'${x[0]}'
						)`).join(', ')}
					;`)
					if (result2.rowsAffected[0] === 0)
						throw new Error('Could not create Activity due to malformed schedule timing parameters.')
				}

				// Get CTest spec list.
				let spec = (await transaction.request().query(`
					SELECT 
						ActivityIndexID AS id, 
						LegacyCTestID AS lid
					FROM LAMP_Aux.dbo.ActivityIndex
				;`)).recordset
				let items = object.settings
									.map((x, idx) => ({ ...Activity._unpack_id(x), idx }))
									.map(x => ({ ...x, lid: (spec.find(a => a['ActivityIndexID'] === x.activity_spec_id) || {})['LegacyCTestID'] }))
				if (items.filter(x => x.activity_spec_id === 0).length > 0)
					throw new Error('Activity Groups cannot be nested within one-another.')

				// FIXME: Shouldn't be able to add deleted surveys/ctests.

				// Create the CTest and Survey lists.
				if (items.filter(x => x.activity_spec_id > 1).length > 0) {
					let result3 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleCTest (AdminBatchSchID, CTestID, Version, [Order]) 
						VALUES ${items.filter(x => x.activity_spec_id > 1).map(x => `(
							${batch_id},
							${x.lid || 'NULL'},
							-1,
							${x.idx + 1}
						)`).join(', ')}
					;`)
					if (result3.rowsAffected[0] !== items.filter(x => x.activity_spec_id > 1).length)
						throw new Error('Could not create Activity due to malformed settings.')
				}
				if (items.filter(x => x.activity_spec_id === 1).length > 0) {
					let result4 = await transaction.request().query(`
						INSERT INTO Admin_BatchScheduleSurvey (AdminBatchSchID, SurveyID, [Order]) 
						VALUES ${items.filter(x => x.activity_spec_id === 1).map(x => `(
							${batch_id},
							${x.survey_id},
							${x.idx + 1}
						)`).join(', ')}
					;`)
					if (result4.rowsAffected[0] !== items.filter(x => x.activity_spec_id === 1).length)
						throw new Error('Could not create Activity due to malformed settings.')
				}

				// Return the new ID.
				await transaction.commit()
				return Activity._pack_id({
					activity_spec_id: 0 /* batch */,
					admin_id: admin_id,
					survey_id: batch_id
				})

			} else if (object.spec === 'lamp.survey' /* survey */) {

				let result1 = await transaction.request().query(`
					INSERT INTO Survey (AdminID, SurveyName) 
					OUTPUT INSERTED.SurveyID
					VALUES (${admin_id}, '${object.name ? _escapeMSSQL(object.name) : 'new_survey'}')
				;`)
				if (result1.rowsAffected[0] === 0)
					throw new Error('Could not create Activity.')
				let survey_id = result1.recordset[0]['SurveyID']

				// Create the questions.
				if (Array.isArray(object.settings) && object.settings.length > 0) {
					let result2 = await transaction.request().query(`
						INSERT INTO SurveyQuestions (SurveyID, QuestionText, AnswerType) 
						OUTPUT INSERTED.QuestionID
						VALUES ${object.settings.map(q => `(
							${survey_id},
							'${_escapeMSSQL(q.text)}',
							${['likert', 'list', 'boolean', 'clock', 'years', 'months', 'days', 'text'].indexOf(q.type) + 1}
						)`).join(', ')}
					;`)
					if (result2.rowsAffected[0] !== object.settings.length)
						throw new Error('Could not create Activity due to malformed settings.')

					let opts = [].concat(...object.settings
												   .map((x, idx) => [x.options, idx])
												   .filter(x => !!x[0])
												   .map(x => x[0].map((y: any) => [y, x[1]])))
					if (opts.length > 0) {
						let result21 = await transaction.request().query(`
							INSERT INTO SurveyQuestionOptions (QuestionID, OptionText) 
							VALUES ${opts.map(q => `(
								${result2.recordset[q[1]]['QuestionID']},
								'${_escapeMSSQL(q[0])}'
							)`).join(', ')}
						;`)
						if (result21.rowsAffected[0] !== opts.length)
							throw new Error('Could not create Activity due to malformed settings.')
					}
				}

				// Create the schedule.
				if (Array.isArray(object.schedule) && object.schedule.length > 0) {
					let result3 = await transaction.request().query(`
						INSERT INTO Admin_SurveySchedule (
							AdminID,
							SurveyID,
							ScheduleDate,
							Time,
							RepeatID
						) 
						OUTPUT INSERTED.AdminSurveySchId
						VALUES ${object.schedule.map(sched => `(
							${admin_id}, 
							${survey_id},
							'${sched.start_date}',
							'${sched.time}',
							${[
								'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
								'biweekly', 'triweekly', 'weekly', 'bimonthly', 
								'monthly', 'custom', 'none'
							].indexOf(sched.repeat_interval) + 1}
						)`).join(', ')}
					;`)
					if (result3.rowsAffected[0] !== object.schedule.length)
						throw new Error('Could not create Activity due to malformed schedule.')

					let ctime = [].concat(...object.schedule
												   .map((x, idx) => [x.custom_time, idx])
												   .filter(x => !!x[0])
												   .map(x => x[0].map((y: any) => [y, x[1]])))
					if (ctime.length > 0) {
						let result4 = await transaction.request().query(`
							INSERT INTO Admin_SurveyScheduleCustomTime (
								AdminSurveySchId,
								Time
							)
							VALUES ${ctime.map(x => `(
								${result3.recordset[x[1]]['AdminSurveySchId']},
								'${x[0]}'
							)`).join(', ')}
						;`)
						if (result4.rowsAffected[0] === 0)
							throw new Error('Could not create Activity due to malformed schedule timing parameters.')
					}
				}

				// Return the new ID.
				await transaction.commit()
				return Activity._pack_id({
					activity_spec_id: 1 /* survey */,
					admin_id: admin_id,
					survey_id: survey_id
				})

			} else /* cognitive test */ {

				// Get the right ActivitySpec IDs.
				let spec = (await transaction.request().query(`
					SELECT 
						ActivityIndexID AS id, 
						LegacyCTestID AS lid
					FROM LAMP_Aux.dbo.ActivityIndex
					WHERE Name = '${object.spec}'
				;`)).recordset[0]
				if (!spec)
					throw new Error('No such ActivitySpec exists.')

				// First activate the CTest if previously inactive.
				let result = await transaction.request().query(`
					UPDATE Admin_CTestSettings 
					SET Status = 1 
					WHERE Status = 0
						AND AdminID = ${admin_id} 
						AND CTestID = ${spec.lid}
				;`)
				if (result.rowsAffected[0] === 0)
					throw new Error('This Activity already exists and cannot be re-created.')

				// Configure Jewels A or B if needed.
				if ((object.spec === 'lamp.jewels_a' || object.spec === 'lamp.jewels_b') && !!object.settings) {
					let isA = object.spec === 'lamp.jewels_a'
					let result2 = await transaction.request().query(`
						UPDATE Admin_JewelsTrails${isA ? 'A' : 'B'}Settings SET
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
						WHERE Admin_JewelsTrails${isA ? 'A' : 'B'}Settings.AdminID = ${admin_id}
					;`)
					if (result2.rowsAffected[0] === 0)
						throw new Error('Could not create Activity due to malformed settings.')
				}

				// Create the schedule.
				if (Array.isArray(object.schedule) && object.schedule.length > 0) {
					let result3 = await transaction.request().query(`
						INSERT INTO Admin_CTestSchedule (
							AdminID,
							CTestID,
							Version,
							ScheduleDate,
							Time,
							RepeatID
						) 
						OUTPUT INSERTED.AdminCTestSchId
						VALUES ${object.schedule.map(sched => `(
							${admin_id}, 
							${spec.lid},
							-1,
							'${sched.start_date}',
							'${sched.time}',
							${[
								'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
								'biweekly', 'triweekly', 'weekly', 'bimonthly', 
								'monthly', 'custom', 'none'
							].indexOf(sched.repeat_interval) + 1}
						)`).join(', ')}
					;`)
					if (result3.rowsAffected[0] !== object.schedule.length)
						throw new Error('Could not create Activity due to malformed schedule.')

					let ctime = [].concat(...object.schedule
												   .map((x, idx) => [x.custom_time, idx])
												   .filter(x => !!x[0])
												   .map(x => x[0].map((y: any) => [y, x[1]])))
					if (ctime.length > 0) {
						let result4 = await transaction.request().query(`
							INSERT INTO Admin_CTestScheduleCustomTime (
								AdminCTestSchId,
								Time
							)
							VALUES ${ctime.map(x => `(
								${result3.recordset[x[1]]['AdminCTestSchId']},
								'${x[0]}'
							)`).join(', ')}
						;`)
						if (result4.rowsAffected[0] === 0)
							throw new Error('Could not create Activity due to malformed schedule timing parameters.')
					}
				}

				// Return the new ID.
				await transaction.commit()
				return Activity._pack_id({
					activity_spec_id: spec.id,
					admin_id: admin_id,
					//survey_id: raw.id
				})
			}
		} catch(e) {
			await transaction.rollback()
			throw e
		}
		throw new Error()
	}

	/**
	 * Update an `Activity` with new fields.
	 */
	private static async _update(

		/**
		 * The Activity's ID.
		 */
		activity_id: Identifier,

		/**
		 * The object containing partial updating fields.
		 */
		object: any

	): Promise<{}> {

		let { activity_spec_id, admin_id, survey_id } = Activity._unpack_id(activity_id)

		if (typeof object.spec === 'string')
			throw new Error('Cannot update the ActivitySpec of an existing Activity; please delete and create a new Activity.')

		let transaction = SQL!.transaction()
		await transaction.begin()
		try {

			// Set the deletion flag, without actually deleting the row.
			if (activity_spec_id === 0 /* group */) {
				
				// Verify that the item exists.
				let result = await transaction.request().query(`
					SELECT AdminBatchSchID 
					FROM Admin_BatchSchedule 
					WHERE IsDeleted = 0
						AND AdminBatchSchID = ${survey_id}
				;`)
				if (result.recordset.length === 0)
					throw new Error('No such Activity exists.')

				// Modify batch schedule and name.
				if (Array.isArray(object.schedule) || typeof object.name === 'string') {
					if (Array.isArray(object.schedule) && object.schedule.length !== 1)
						throw new Error('This ActivitySpec requires a schedule of exactly one DurationInterval.')
					
					let result1 = await transaction.request().query(`
						UPDATE Admin_BatchSchedule SET 
							${[
								!!object.name ? `BatchName = '${object.name}'` : null,
								!!object.schedule[0].start_date ? `ScheduleDate = '${object.schedule[0].start_date}'` : null,
								!!object.schedule[0].time ? `Time = '${object.schedule[0].time}'` : null,
								!!object.schedule[0].repeat_interval ? `RepeatID = ${[
									'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
									'biweekly', 'triweekly', 'weekly', 'bimonthly', 
									'monthly', 'custom', 'none'
								].indexOf(object.schedule[0].repeat_interval) + 1}` : null
							].filter(x => x !== null).join(', ')}
						WHERE IsDeleted = 0
							AND AdminBatchSchID = ${survey_id}
					;`)
					
					// Modify custom times.
					if (Array.isArray(object.schedule[0].custom_time)) {
						let ctime = object.schedule[0].custom_time
						let result2 = await transaction.request().query(`
							MERGE INTO Admin_BatchScheduleCustomTime Target
							USING (VALUES
								${ctime.length === 0 ? '(NULL, NULL)' : ctime.map((x: any) => `(${survey_id}, '${_escapeMSSQL(x)}')`).join(', ')}
							) AS Source(AdminBatchSchID, Time)
								ON Target.AdminBatchSchID = Source.AdminBatchSchID 
								AND Target.Time = Source.Time
							WHEN NOT MATCHED BY Target THEN
								INSERT (AdminBatchSchID, Time) 
								VALUES (Source.AdminBatchSchID, Source.Time)
							WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${survey_id} THEN 
								DELETE
							OUTPUT $ACTION, INSERTED.*, DELETED.*
						;`)
					}
				}

				// Modify batch settings.
				if (Array.isArray(object.settings)) {
					let spec = (await transaction.request().query(`
						SELECT 
							ActivityIndexID AS id, 
							LegacyCTestID AS lid
						FROM LAMP_Aux.dbo.ActivityIndex
					;`)).recordset
					let items = (object.settings as Array<string>)
										.map((x, idx) => ({ ...Activity._unpack_id(x), idx }))
										.map(x => ({ ...x, lid: (spec.find(a => a['id'] === `${x.activity_spec_id}`) || {})['lid'] }))

					if (items.filter(x => x.activity_spec_id === 0).length > 0)
						throw new Error('Activity Groups cannot be nested within one-another.')
					if (items.filter(x => x.activity_spec_id !== 0).length === 0)
						throw new Error('This ActivitySpec requires settings of a non-zero length array.')
					let ctest = items.filter(x => x.activity_spec_id > 1)
					let survey = items.filter(x => x.activity_spec_id === 1)

					// FIXME: confirm survey/ctest not deleted first + exists!

					let result3 = await transaction.request().query(`
						MERGE INTO Admin_BatchScheduleCTest Target
						USING (VALUES
							${ctest.length === 0 ? '(NULL, NULL, NULL)' : ctest.map(x => `(${survey_id}, ${x.lid || 'NULL'}, ${x.idx + 1})`).join(', ')}
						) AS Source(AdminBatchSchID, CTestID, [Order])
							ON Target.AdminBatchSchID = Source.AdminBatchSchID 
							AND Target.CTestID = Source.CTestID
							AND Target.[Order] = Source.[Order]
							AND Source.AdminBatchSchID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (AdminBatchSchID, CTestID, Version, [Order]) 
							VALUES (Source.AdminBatchSchID, Source.CTestID, -1, Source.[Order])
						WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${survey_id} THEN 
							DELETE
						OUTPUT $ACTION, INSERTED.*, DELETED.*
					;`)

					let result4 = await transaction.request().query(`
						MERGE INTO Admin_BatchScheduleSurvey Target
						USING (VALUES
							${survey.length === 0 ? '(NULL, NULL, NULL)' : survey.map((x: any) => `(${survey_id}, ${x.survey_id}, ${x.idx + 1})`).join(', ')}
						) AS Source(AdminBatchSchID, SurveyID, [Order])
							ON Target.AdminBatchSchID = Source.AdminBatchSchID 
							AND Target.SurveyID = Source.SurveyID
							AND Target.[Order] = Source.[Order]
							AND Source.AdminBatchSchID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (AdminBatchSchID, SurveyID, [Order]) 
							VALUES (Source.AdminBatchSchID, Source.SurveyID, Source.[Order])
						WHEN NOT MATCHED BY Source AND Target.AdminBatchSchID = ${survey_id} THEN 
							DELETE
						OUTPUT $ACTION, INSERTED.*, DELETED.*
					;`)
				}

				await transaction.commit()
				return {}

			} else if (activity_spec_id === 1 /* survey */) {

				// Modify survey name or verify that the item exists.
				if (typeof object.name === 'string') {					
					let result0 = await transaction.request().query(`
						UPDATE Survey SET 
							SurveyName = '${_escapeMSSQL(object.name)}'
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
					if (result0.rowsAffected[0] === 0)
						throw new Error('No such Activity exists.')
				} else {
					let result0 = await transaction.request().query(`
						SELECT SurveyID 
						FROM Survey 
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
					if (result0.recordset.length === 0)
						throw new Error('No such Activity exists.')
				}

				// Modify survey schedule.
				if (Array.isArray(object.schedule)) {
					let result2 = await transaction.request().query(`
						UPDATE Admin_SurveySchedule 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND AdminID = ${admin_id} 
							AND SurveyID = ${survey_id}
					;`)
					if (object.schedule.length > 0) {
						let result3 = await transaction.request().query(`
							INSERT INTO Admin_SurveySchedule (
								AdminID,
								SurveyID,
								ScheduleDate,
								Time,
								RepeatID
							) 
							OUTPUT INSERTED.AdminSurveySchId
							VALUES ${object.schedule.map((sched: any) => `(
								${admin_id}, 
								${survey_id},
								'${sched.start_date}',
								'${sched.time}',
								${[
									'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
									'biweekly', 'triweekly', 'weekly', 'bimonthly', 
									'monthly', 'custom', 'none'
								].indexOf(sched.repeat_interval) + 1}
							)`).join(', ')}
						;`)
						if (result3.rowsAffected[0] !== object.schedule.length)
							throw new Error('Could not create Activity due to malformed schedule.')

						let ctime = [].concat(...object.schedule
													   .map((x: any, idx: number) => [x.custom_time, idx])
													   .filter((x: any) => !!x[0])
													   .map((x: any) => x[0].map((y: any) => [y, x[1]])))
						if (ctime.length > 0) {
							let result4 = await transaction.request().query(`
								INSERT INTO Admin_SurveyScheduleCustomTime (
									AdminSurveySchId,
									Time
								)
								VALUES ${ctime.map(x => `(
									${result3.recordset[x[1]]['AdminSurveySchId']},
									'${x[0]}'
								)`).join(', ')}
							;`)
							if (result4.rowsAffected[0] === 0)
								throw new Error('Could not create Activity due to malformed schedule timing parameters.')
						}
					}
				}

				// Modify survey questions.
				if (Array.isArray(object.settings)) {
					let result3 = await transaction.request().query(`
						UPDATE SurveyQuestions 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND SurveyID = ${survey_id}
					;`)
					if (object.settings.length > 0) {
						let result2 = await transaction.request().query(`
							INSERT INTO SurveyQuestions (SurveyID, QuestionText, AnswerType) 
							OUTPUT INSERTED.QuestionID
							VALUES ${object.settings.map((q: any) => `(
								${survey_id},
								'${_escapeMSSQL(q.text)}',
								${['likert', 'list', 'boolean', 'clock', 'years', 'months', 'days', 'text'].indexOf(q.type) + 1}
							)`).join(', ')}
						;`)
						if (result2.rowsAffected[0] !== object.settings.length)
							throw new Error('Could not create Activity due to malformed settings.')

						let opts = [].concat(...object.settings
													   .map((x: any, idx: number) => [x.options, idx])
													   .filter((x: any) => !!x[0])
													   .map((x: any) => x[0].map((y: any) => [y, x[1]])))
						if (opts.length > 0) {
							let result21 = await transaction.request().query(`
								INSERT INTO SurveyQuestionOptions (QuestionID, OptionText) 
								VALUES ${opts.map(q => `(
									${result2.recordset[q[1]]['QuestionID']},
									'${_escapeMSSQL(q[0])}'
								)`).join(', ')}
							;`)
							if (result21.rowsAffected[0] !== opts.length)
								throw new Error('Could not create Activity due to malformed settings.')
						}
					}
				}

				/*
				// Modify survey schedule.
				if (Array.isArray(object.schedule)) {
					let result1 = await transaction.request().query(`
						MERGE INTO Admin_SurveySchedule Target
						USING (VALUES
							${object.schedule.length === 0 ? '(NULL, NULL, NULL, NULL)' : object.schedule.map((x: any, idx: number) => `(
								${idx}, ${admin_id}, ${survey_id}, '${x.start_date}', '${x.time}', ${[
									'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
									'biweekly', 'triweekly', 'weekly', 'bimonthly', 
									'monthly', 'custom', 'none'
								].indexOf(x.repeat_interval) + 1}
							)`).join(', ')}
						) AS Source(Idx, AdminID, SurveyID, ScheduleDate, Time, RepeatID)
							ON Target.AdminID = Source.AdminID 
							AND Target.SurveyID = Source.SurveyID 
							AND Target.ScheduleDate = Source.ScheduleDate
							AND Target.Time = Source.Time
							AND Target.RepeatID = Source.RepeatID
							AND Source.SurveyID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (AdminID, SurveyID, ScheduleDate, Time, RepeatID) 
							VALUES (Source.AdminID, Source.SurveyID, Source.ScheduleDate, Source.Time, Source.RepeatID)
						WHEN NOT MATCHED BY Source 
							AND Target.AdminID = ${admin_id} 
							AND Target.SurveyID = ${survey_id} 
							AND Target.IsDeleted = 0 
						THEN 
							UPDATE SET IsDeleted = 1
						WHEN MATCHED AND Target.IsDeleted = 1 THEN
							UPDATE SET IsDeleted = 0
						OUTPUT $ACTION, INSERTED.*, DELETED.*, Source.Idx
					;`)

					// FIXME: changing ctime requires changing something else as well, or it won't activate the below
					
					// Modify custom times.
					let ctime = [].concat(...object.schedule
									.map((x: any | null, idx: number) => (x.custom_time || [])
										.map((y: string) => ({ idx: idx, value: y }))))
									.map((x: any) => ({ ...x, idx: (result1.recordset
										.find(y => !!y['Idx'] && (parseInt(y['Idx']) + 1) === x.idx) || { AdminSurveySchID: [] })['AdminSurveySchID'][0] }))
									.filter(x => !!x.idx)
					if (ctime.length > 0) {
						let result2 = await transaction.request().query(`
							MERGE INTO Admin_SurveyScheduleCustomTime Target
							USING (VALUES
								${ctime.length === 0 ? '(NULL, NULL)' : ctime.map((x: any) => `(${x.idx}, '${x.value}')`).join(', ')}
							) AS Source(AdminSurveySchID, Time)
								ON Target.AdminSurveySchID = Source.AdminSurveySchID 
								AND Target.Time = Source.Time
								AND Source.AdminSurveySchID IS NOT NULL
							WHEN NOT MATCHED BY Target THEN
								INSERT (AdminSurveySchID, Time) 
								VALUES (Source.AdminSurveySchID, Source.Time)
							WHEN NOT MATCHED BY Source AND Target.AdminSurveySchID = ${survey_id} THEN 
								DELETE
							OUTPUT $ACTION, INSERTED.*, DELETED.*
						;`)
					}
				}

				// Modify batch settings.
				if (Array.isArray(object.settings)) {
					let result1 = await transaction.request().query(`
						MERGE INTO SurveyQuestions Target
						USING (VALUES
							${object.settings.length === 0 ? '(NULL, NULL, NULL, NULL)' : object.settings.map((x: any, idx: number) => `(
								${idx}, ${survey_id}, '${x.text}',
								${['likert', 'list', 'boolean', 'clock', 'years', 'months', 'days', 'text'].indexOf(x.type) + 1}
							)`).join(', ')}
						) AS Source(Idx, SurveyID, QuestionText, AnswerType)
							ON Target.SurveyID = Source.SurveyID 
							AND Target.QuestionText = Source.QuestionText
							AND Target.AnswerType = Source.AnswerType
							AND Source.SurveyID IS NOT NULL
						WHEN NOT MATCHED BY Target THEN
							INSERT (SurveyID, QuestionText, AnswerType) 
							VALUES (Source.SurveyID, Source.QuestionText, Source.AnswerType)
						WHEN NOT MATCHED BY Source 
							AND Target.SurveyID = ${survey_id} 
							AND Target.IsDeleted = 0 
						THEN 
							UPDATE SET IsDeleted = 1
						WHEN MATCHED AND Target.IsDeleted = 1 THEN
							UPDATE SET IsDeleted = 0
						OUTPUT $ACTION, INSERTED.*, DELETED.*, Source.Idx
					;`)

					// FIXME: changing options requires changing something else as well, or it won't activate the below
					
					// Modify custom times.
					let opts = [].concat(...object.settings
									.map((x: any | null, idx: number) => (x.options || [])
										.map((y: string) => ({ idx: idx, value: y }))))
									.map((x: any) => ({ ...x, idx: (result1.recordset
										.find(y => !!y['Idx'] && (parseInt(y['Idx']) + 1) === x.idx) || { OptionID: [] })['OptionID'][0] }))
									.filter(x => !!x.idx)
					if (opts.length > 0) {
						let result2 = await transaction.request().query(`
							MERGE INTO SurveyQuestionOptions Target
							USING (VALUES
								${opts.length === 0 ? '(NULL, NULL)' : opts.map((x: any) => `(${x.idx}, '${x.value}')`).join(', ')}
							) AS Source(QuestionID, OptionText)
								ON Target.QuestionID = Source.QuestionID 
								AND Target.OptionText = Source.OptionText
								AND Source.QuestionID IS NOT NULL
							WHEN NOT MATCHED BY Target THEN
								INSERT (QuestionID, OptionText) 
								VALUES (Source.QuestionID, Source.OptionText)
							WHEN NOT MATCHED BY Source AND Target.QuestionID = ${survey_id} THEN 
								DELETE
							OUTPUT $ACTION, INSERTED.*, DELETED.*
						;`)
						console.dir(result2)
					}
				}
				*/

				await transaction.commit()
				return {}

			} else /* cognitive test */ {

				// Get the right ActivitySpec IDs.
				let spec = (await transaction.request().query(`
					SELECT 
						ActivityIndexID AS id, 
						LegacyCTestID AS lid, 
						Name AS name
					FROM LAMP_Aux.dbo.ActivityIndex
					WHERE ActivityIndexID = '${activity_spec_id}'
				;`)).recordset[0]
				if (!spec)
					throw new Error('No such ActivitySpec exists.')
				
				// Verify that the item exists.
				let result = await transaction.request().query(`
					SELECT AdminID, CTestID 
					FROM Admin_CTestSettings 
					WHERE Status = 1
						AND AdminID = ${admin_id}
						AND CTestID = ${survey_id}
				;`)
				if (result.recordset.length === 0)
					throw new Error('No such Activity exists.')

				// Modify ctest schedule.
				if (Array.isArray(object.schedule)) {
					let result2 = await transaction.request().query(`
						UPDATE Admin_CTestSchedule 
						SET IsDeleted = 1
						WHERE IsDeleted = 0
							AND AdminID = ${admin_id} 
							AND CTestID IN (
								SELECT LegacyCTestID
								FROM LAMP_Aux.dbo.ActivityIndex
								WHERE ActivityIndexID = ${activity_spec_id}
							)
					;`)
					if (object.schedule.length > 0) {
						let result3 = await transaction.request().query(`
							INSERT INTO Admin_CTestSchedule (
								AdminID,
								CTestID,
								Version,
								ScheduleDate,
								Time,
								RepeatID
							) 
							OUTPUT INSERTED.AdminCTestSchId
							VALUES ${object.schedule.map((sched: any) => `(
								${admin_id}, 
								${spec.lid},
								-1,
								'${sched.start_date}',
								'${sched.time}',
								${[
									'hourly', 'every3h', 'every6h', 'every12h', 'daily', 
									'biweekly', 'triweekly', 'weekly', 'bimonthly', 
									'monthly', 'custom', 'none'
								].indexOf(sched.repeat_interval) + 1}
							)`).join(', ')}
						;`)
						if (result3.rowsAffected[0] !== object.schedule.length)
							throw new Error('Could not create Activity due to malformed schedule.')

						let ctime = [].concat(...object.schedule
													   .map((x: any, idx: number) => [x.custom_time, idx])
													   .filter((x: any) => !!x[0])
													   .map((x: any) => x[0].map((y: any) => [y, x[1]])))
						if (ctime.length > 0) {
							let result4 = await transaction.request().query(`
								INSERT INTO Admin_CTestScheduleCustomTime (
									AdminCTestSchId,
									Time
								)
								VALUES ${ctime.map(x => `(
									${result3.recordset[x[1]]['AdminCTestSchId']},
									'${x[0]}'
								)`).join(', ')}
							;`)
							if (result4.rowsAffected[0] === 0)
								throw new Error('Could not create Activity due to malformed schedule timing parameters.')
						}
					}
				}

				// Modify survey questions.
				if (typeof object.settings === 'object' && (spec.name === 'lamp.jewels_a' || spec.name === 'lamp.jewels_b')) {
					let isA = spec.name === 'lamp.jewels_a'
					let result2 = await transaction.request().query(`
						UPDATE Admin_JewelsTrails${isA ? 'A' : 'B'}Settings SET
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
						WHERE Admin_JewelsTrails${isA ? 'A' : 'B'}Settings.AdminID = ${admin_id}
					;`)
					if (result2.rowsAffected[0] === 0)
						throw new Error('Could not create Activity due to malformed settings.')
				}

				await transaction.commit()
				return {}
			}
		} catch(e) {
			await transaction.rollback()
			throw e
		}
		throw new Error()
	}

	/**
	 * Delete an `Activity` row.
	 */
	private static async _delete(

		/**
		 * The Activity's ID.
		 */
		activity_id: Identifier

	): Promise<{}> {

		let { activity_spec_id, admin_id, survey_id } = Activity._unpack_id(activity_id)
		let transaction = SQL!.transaction()
		await transaction.begin()
		try {

			// Set the deletion flag, without actually deleting the row.
			if (activity_spec_id === 0 /* group */) {
				let result = await transaction.request().query(`
					UPDATE Admin_BatchSchedule 
					SET IsDeleted = 1 
					WHERE IsDeleted = 0
						AND AdminBatchSchID = ${survey_id}
				;`)
				if (result.rowsAffected[0] === 0)
					throw new Error('No such Activity exists.')

			} else if (activity_spec_id === 1 /* survey */) {
				let result = await transaction.request().query(`
					UPDATE Survey 
					SET IsDeleted = 1 
					WHERE IsDeleted = 0 
						AND AdminID = ${admin_id} 
						AND SurveyID = ${survey_id}
				;`)
				if (result.rowsAffected[0] === 0)
					throw new Error('No such Activity exists.')

				let result2 = await transaction.request().query(`
					UPDATE Admin_SurveySchedule 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND AdminID = ${admin_id} 
						AND SurveyID = ${survey_id}
				;`)

				let result3 = await transaction.request().query(`
					UPDATE SurveyQuestions 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND SurveyID = ${survey_id}
				;`)

			} else /* cognitive test */ {
				let result1 = await transaction.request().query(`
					UPDATE Admin_CTestSettings 
					SET Status = 0 
					WHERE Status = 1
						AND AdminID = ${admin_id} 
						AND CTestID IN (
							SELECT LegacyCTestID
							FROM LAMP_Aux.dbo.ActivityIndex
							WHERE ActivityIndexID = ${activity_spec_id}
						)
				;`)
				if (result1.rowsAffected[0] === 0)
					throw new Error('No such Activity exists.')

				let result2 = await transaction.request().query(`
					UPDATE Admin_CTestSchedule 
					SET IsDeleted = 1
					WHERE IsDeleted = 0
						AND AdminID = ${admin_id} 
						AND CTestID IN (
							SELECT LegacyCTestID
							FROM LAMP_Aux.dbo.ActivityIndex
							WHERE ActivityIndexID = ${activity_spec_id}
						)
				;`)
			}

			await transaction.commit()
			return {}
		} catch(e) {
			await transaction.rollback()
			throw e
		}
		throw new Error()
	}
}

const spec_map: { [string: string]: any; } = {
	'lamp.group': 'Activity Group',
	'lamp.survey': 'Survey',
	'lamp.nback': 'N-Back',
	'lamp.trails_b': 'Trails B',
	'lamp.spatial_span': 'Spatial Span',
	'lamp.simple_memory': 'Simple Memory',
	'lamp.serial7s': 'Serial 7s',
	'lamp.cats_and_dogs': 'Cats and Dogs',
	'lamp.3d_figure_copy': '3D Figure Copy',
	'lamp.visual_association': 'Visual Association',
	'lamp.digit_span': 'Digit Span',
	'lamp.cats_and_dogs_new': 'Cats and Dogs New',
	'lamp.temporal_order': 'Temporal Order',
	'lamp.nback_new': 'N-Back New',
	'lamp.trails_b_new': 'Trails B New',
	'lamp.trails_b_dot_touch': 'Trails B Dot Touch',
	'lamp.jewels_a': 'Jewels Trails A',
	'lamp.jewels_b': 'Jewels Trails B',
	'lamp.scratch_image': 'Scratch Image',
	'lamp.spin_wheel': 'Spin Wheel',
}

const _escapeMSSQL = (val: string) => val.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s: string) => {
	switch (s) {
	  case "\0":
	    return "\\0";
	  case "\n":
	    return "\\n";
	  case "\r":
	    return "\\r";
	  case "\b":
	    return "\\b";
	  case "\t":
	    return "\\t";
	  case "\x1a":
	    return "\\Z";
	  case "'":
	    return "''";
	  case '"':
	    return '""';
	  default:
	    return "\\" + s;
	}
})
