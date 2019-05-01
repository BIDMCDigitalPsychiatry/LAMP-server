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

	): Promise<Identifier> {
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

	): Promise<Identifier> {
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
						WHERE IsDeleted = 0 AND SurveyID = '${survey_id}';
					`)).recordset
					return result.length === 0 ? undefined :
						(type === Researcher ? Researcher : Study)._pack_id({ admin_id: result[0].value })
				} else {

					// Only "Survey" types lack an encoded AdminID; regardless, verify their deletion.
					let result = (await SQL!.request().query(`
						SELECT AdminID AS value
						FROM Admin
						WHERE IsDeleted = 0 AND AdminID = '${admin_id}';
					`)).recordset
					return result.length === 0 ? undefined :
						(type === Researcher ? Researcher : Study)._pack_id({ admin_id: result[0].value })
				}
			default: throw new Error()
		}
	}

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

		let result = await SQL!.request().query(`
		WITH A(value) AS (
			SELECT 
				AdminID AS aid,
				('ctest') AS type,
				CTest.*,
				(
					SELECT 
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
					WHERE Admin_JewelsTrailsASettings.AdminID = Admin.AdminID
						AND CTest.lid = 17
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsA],
				(
					SELECT
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
					WHERE Admin_JewelsTrailsBSettings.AdminID = Admin.AdminID
						AND CTest.lid = 18
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsB],
				(
					SELECT
						Version as version,
						ScheduleDate as schedule_date,
						Time as time,
						RepeatID as repeat_interval,
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								Time AS t
							FROM Admin_CTestScheduleCustomTime
							WHERE Admin_CTestScheduleCustomTime.AdminCTestSchId = Admin_CTestSchedule.AdminCTestSchId
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 't')) AS custom_time
					FROM Admin_CTestSchedule
					WHERE Admin_CTestSchedule.AdminID = Admin.AdminID
						AND Admin_CTestSchedule.CTestID = CTest.lid
						AND Admin_CTestSchedule.IsDeleted = 0
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS schedule
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
			WHERE isDeleted = 0 
				${!ctest_id ? '' : `AND CTest.id = '${ctest_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
			FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
		), B(value) AS (
			SELECT 
				SurveyID AS id, 
				AdminID AS aid,
				SurveyName AS name, 
				('survey') AS type,
				(
					SELECT 
						QuestionText AS text, 
						CHOOSE(AnswerType, 
							'likert', 'list', 'boolean', 'clock', 'years', 'months', 'days'
						) AS type, 
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								OptionText AS opt
							FROM SurveyQuestionOptions
							WHERE SurveyQuestionOptions.QuestionID = SurveyQuestions.QuestionID
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 'opt')) AS options
						FROM SurveyQuestions
						WHERE IsDeleted = 0 
							AND SurveyQuestions.SurveyID = Survey.SurveyID
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS questions,
				(
					SELECT
						ScheduleDate as schedule_date,
						Time as time,
						RepeatID as repeat_interval,
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								Time AS t
							FROM Admin_SurveyScheduleCustomTime
							WHERE Admin_SurveyScheduleCustomTime.AdminSurveySchId = Admin_SurveySchedule.AdminSurveySchId
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 't')) AS custom_time
					FROM Admin_SurveySchedule
					WHERE Admin_SurveySchedule.SurveyID = Survey.SurveyID
						AND Admin_SurveySchedule.IsDeleted = 0
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS schedule
			FROM Survey
			WHERE isDeleted = 0 
				${!ctest_id ? '' : (ctest_id === 1 /* survey */ ? '' : `AND 1=0`)}
				${!survey_id ? '' : `AND SurveyID = '${survey_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
			FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
		)
		SELECT CONCAT('[', A.value, CASE 
			WHEN LEN(A.value) > 0 AND LEN(B.value) > 0 THEN ',' ELSE '' 
		END, B.value, ']')
		FROM A, B;
		`)

		let result2 = JSON.parse(result.recordset[0][''])
		if (result2.length === 0)
			return []
		return result2.map((raw: any) => {
			let obj = new Activity()
			if (raw.type === 'ctest') {
				obj.id = Activity._pack_id({
					activity_spec_id: raw.id,
					admin_id: raw.aid
				})
				obj.spec = raw.name
				obj.name = spec_map[(<string>raw.name)]
				obj.settings = {
					...(raw.settings.jewelsA || ({'0': {}}))['0'],
					...(raw.settings.jewelsB || ({'0': {}}))['0']
				}
			} else if (raw.type === 'survey') {
				obj.id = Activity._pack_id({
					activity_spec_id: 1 /* survey */,
					admin_id: raw.aid,
					survey_id: raw.id
				})
				obj.spec = 'lamp.survey'
				obj.name = raw.name
				obj.settings = raw.questions
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

		// Non-Survey Activities cannot be created!
		if (object.spec! !== 'lamp.survey')
			throw new Error()

		 // TODO... use schedule + settings for survey config!

		throw new Error()
		return ''
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

	): Promise<Identifier> {

		// TODO: ActivitySpec::_jewelsMap('key', null)

		// ... use name for rename activity only
		// ... use schedule + settings for survey config!

		throw new Error()
		return ''
	}

	/**
	 * Delete an `Activity` row.
	 */
	private static async _delete(

		/**
		 * The Activity's ID.
		 */
		activity_id: Identifier

	): Promise<Identifier> {

		let id = Activity._unpack_id(activity_id)
		if (id.activity_spec_id !== 1 /* survey */ && id.survey_id !== 0)
			throw new Error()

		// Set the deletion flag, without actually deleting the row.
		return (await SQL!.request().query(`
			UPDATE Survey SET IsDeleted = 1 WHERE SurveyID = ${id.survey_id};
		`)).recordset[0]
	}
}

const spec_map: { [string: string]: any; } = {
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
