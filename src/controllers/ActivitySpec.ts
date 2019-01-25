import { SQL, Encrypt, Decrypt } from '../index'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'

/**
 * !!!!!!!!!!!!!!!!!!!!!!!
 * !!! CRITICAL NOTICE !!!
 * !!!!!!!!!!!!!!!!!!!!!!!
 *
 * All Driver code used in LAMP requires two assumptions to hold true *ALWAYS*!
 *     (1) ActivitySpec ID:0 belongs to "Activity Group".
 *     (2) ActivitySpec ID:1 belongs to "Survey".
 * If these two conditions are not satisfied, *ALL DATA INTEGRITY IS LOST*!
 *
 * !!!!!!!!!!!!!!!!!!!!!!!
 * !!! CRITICAL NOTICE !!!
 * !!!!!!!!!!!!!!!!!!!!!!!
 */

export enum QuestionType {
	Likert = 'likert',
	List = 'list',
	YesNo = 'boolean',
	Clock = 'clock',
	Years = 'years',
	Months = 'months',
	Days = 'days'
}
Enum(QuestionType, d`
	The kind of response to a question.
`)
Enum.Description(QuestionType, 'Likert', d`
	A five-point likert scale. The \`options\` field will be \`null\`.
`)
Enum.Description(QuestionType, 'List', d`
	A list of choices to select from.
`)
Enum.Description(QuestionType, 'YesNo', d`
	A \`true\` or \`false\` (or \`yes\` and \`no\`) toggle. The \`options\` field will be \`null\`.
`)
Enum.Description(QuestionType, 'Clock', d`
	A time selection clock. The \`options\` field will be \`null\`.
`)
Enum.Description(QuestionType, 'Years', d`
	A number of years. The \`options\` field will be \`null\`.
`)
Enum.Description(QuestionType, 'Months', d`
	A number of months. The \`options\` field will be \`null\`.
`)
Enum.Description(QuestionType, 'Days', d`
	A number of days. The \`options\` field will be \`null\`.
`)

@Schema()
@Description(d`
	A question within a survey-type \`Activity\`.
`)
export class Question {

	@Property()
	@Description(d`
		The type of question within a survey activity.
	`)
	public type?: QuestionType

	@Property()
	@Description(d`
		The prompt for the question.
	`)
	public text?: string

	@Property()
	@Description(d`
		Possible option choices for a question of type \`list\`.
	`)
	public options?: string[]
}

@Schema()
@Description(d`
	The parameters of a setting, static data, or temporal event 
	key, for an \`ActivitySpec\`.
`)
export class ActivitySpecItem {

	@Property()
	@Description(d`
		The name of the specification item.
	`)
	public name?: string

	@Property()
	@Description(d`
		The type of specification item, as a JSON Schema.
	`)
	public type?: string

	@Property()
	@Description(d`
		The default value of the specification item.
	`)
	public default?: string
}

@Schema()
@Description(d`
	The definition of an \`Activity\`'s \`ResultEvent\`s.
`)
export class ActivityDefinition {

	@Property()
	@Retype(Array, ActivitySpecItem)
	@Description(d`
		The static data definition of an ActivitySpec.
	`)
	public static_data?: ActivitySpecItem[]

	@Property()
	@Retype(Array, ActivitySpecItem)
	@Description(d`
		The temporal event data definition of an ActivitySpec.
	`)
	public temporal_event?: ActivitySpecItem[]

	@Property()
	@Retype(Array, ActivitySpecItem)
	@Description(d`
		The Activity settings definition of an ActivitySpec.
	`)
	public settings?: ActivitySpecItem[]
}

@Schema()
@Parent(Study)
@Description(d`
	The ActivitySpec determines the parameters and properties of an
	Activity and its corresponding generated ResultEvents.
`)
export class ActivitySpec {

	@Property()
	@Description(d`
		The self-referencing identifier to this object.
	`)
	public id?: Identifier

	@Property()
	@Description(d`
		External or out-of-line objects attached to this object.
	`)
	public attachments?: any

	@Property()
	@Description(d`
		The name of the activity spec.
	`)
	public name?: string

	@Property()
	@Description(d`
		Either a binary blob containing a document or video, or a string
		containing instructional aid about the Activity.
	`)
	public help_contents?: string

	@Property()
	@Description(d`
		The WebView-compatible script that provides this Activity on
		mobile or desktop (IFrame) clients.
	`)
	public script_contents?: string

	@Property()
	@Description(d`
		The JSON Schema-based Activity definition and specification information.
	`)
	public definition?: ActivityDefinition

	@Route.POST('/study/{study_id}/activity_spec') 
	@Description(d`
		Create a new ActivitySpec visible to the given Study.
	`)
	@Auth(Ownership.Self, 'study_id')
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string,

		@Body()
		activity_spec: ActivitySpec,

	): Promise<Identifier> {
		return ActivitySpec._insert(study_id, activity_spec)
	}

	@Route.PUT('/activity_spec/{activity_spec_id}') 
	@Description(d`
		Update an ActivitySpec.
	`)
	@Auth(Ownership.Self, 'activity_spec_id')
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('activity_spec_id')
		@Retype(Identifier, ActivitySpec)
		activity_spec_id: string,

		@Body()
		activity_spec: ActivitySpec,

	): Promise<Identifier> {
		return ActivitySpec._update(activity_spec_id, activity_spec)
	}

	@Route.DELETE('/activity_spec/{activity_spec_id}') 
	@Description(d`
		Delete an ActivitySpec.
	`)
	@Auth(Ownership.Self, 'activity_spec_id')
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('activity_spec_id')
		@Retype(Identifier, ActivitySpec)
		activity_spec_id: string

	): Promise<Identifier> {
		return ActivitySpec._delete(activity_spec_id)
	}

	@Route.GET('/activity_spec/{activity_spec_id}') 
	@Description(d`
		Get a single ActivitySpec by identifier.
	`)
	@Auth(Ownership.Self, 'activity_spec_id')
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('activity_spec_id')
		@Retype(Identifier, ActivitySpec)
		activity_spec_id: string

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select(activity_spec_id)
	}

	@Route.GET('/participant/{participant_id}/activity_spec') 
	@Description(d`
		Get all ActivitySpecs visible to a Participant.
	`)
	@Auth(Ownership.Sibling, 'participant_id')
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_participant(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select(participant_id)
	}

	@Route.GET('/study/{study_id}/activity_spec') 
	@Description(d`
		Get the set of all ActivitySpecs available to 
		participants of a single study, by study identifier.
	`)
	@Auth(Ownership.Parent, 'study_id')
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_study(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select(study_id)
	}

	@Route.GET('/researcher/{researcher_id}/activity_spec') 
	@Description(d`
		Get the set of all activities available to participants 
		of any study conducted by a researcher, by researcher identifier.
	`)
	@Auth(Ownership.Parent, 'researcher_id')
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_researcher(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select(researcher_id)
	}

	@Route.GET('/activity_spec') 
	@Description(d`
		Get all ActivitySpecs registered by any Researcher.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select()
	}

	/**
	 *
	 */
	public static _pack_id(components: {

		/**
		 * 
		 */
		activity_spec_id?: number

	}): Identifier {
		return Identifier.pack([
			(<any>ActivitySpec).name, 
			components.activity_spec_id || 0,
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

	}) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>ActivitySpec).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(parseInt)
		return {
			activity_spec_id: !isNaN(result[0]) ? result[0] : 0
		}
	}

	/**
	 *
	 */
	public static async _parent_id(id: Identifier, type: Function): Promise<Identifier | undefined> {
		let { activity_spec_id } = ActivitySpec._unpack_id(id)
		switch (type) {
			default: throw new Error()
		}
	}

	/**
	 * Get a set of `ActivitySpec`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * The identifier of the object or any parent.
		 */
		id?: Identifier

	): Promise<ActivitySpec[]> {

		// Get the correctly scoped identifier to search within.
		let index_id: number | undefined
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Study).name)
			admin_id = Study._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>ActivitySpec).name)
			index_id = ActivitySpec._unpack_id(id).activity_spec_id
		else if(!!id) throw new Error()
		
		// Short-circuit to the batch spec if requested.
		if (index_id === 0)
			return [ActivitySpec.batchSpec]

		// Collect the set of legacy Activity tables and stitch the full query.
		let result = await SQL!.request().query(`
			SELECT 
	        	ActivityIndexID AS id,
	        	Name AS name
			FROM LAMP_Aux.dbo.ActivityIndex
			${!!index_id ? `WHERE ActivityIndexID = ${index_id}` : ''};
		`)

		// Convert fields correctly and return the spec objects.
		// Include the batchSpec only if a non-specific lookup was made.
		return [
			...[ActivitySpec.batchSpec],
			...result.recordsets[0].map(x => {
				let obj = new ActivitySpec()
				obj.id = ActivitySpec._pack_id({ activity_spec_id: x.id })
				obj.name = x.name
				return obj
			})
		]
	}

	/**
	 * Create a `ActivitySpec` with a new object.
	 */
	private static async _insert(

		/**
		 * The parent study ID.
		 */
		study_id: Identifier,

		/**
		 * The new object.
		 */
		object: ActivitySpec

	): Promise<Identifier> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Update a `ActivitySpec` with new fields.
	 */
	private static async _update(

		/**
		 * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
		 */
		activity_spec_id: Identifier,

		/**
		 * The replacement object or specific fields within.
		 */
		object: ActivitySpec

	): Promise<Identifier> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Delete a `ActivitySpec` row.
	 */
	private static async _delete(

		/**
		 * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
		 */
		activity_spec_id: Identifier

	): Promise<Identifier> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * The ActivitySpec with ID = 0 is specially known as the "batch spec."
	 */
	private static get batchSpec() {
		let obj = new ActivitySpec()
		obj.id = ActivitySpec._pack_id({ activity_spec_id: 0 })
		obj.name = 'Activity Group'
		obj.definition = new ActivityDefinition()
		obj.definition.settings = [
			<ActivitySpecItem>{
				name: 'item1', /* static for now */
				type: 'string', /* switch to schema format */
				default: undefined /* null vs. 'null' */
			},
			<ActivitySpecItem>{
				name: 'item2', /* static for now */
				type: 'string', /* switch to schema format */
				default: undefined /* null vs. 'null' */
			},
			<ActivitySpecItem>{
				name: 'item3', /* static for now */
				type: 'string', /* switch to schema format */
				default: undefined /* null vs. 'null' */
			}
		]
		return obj
	}

	/**
	 * Produce the internal-only Jewels A/B settings mappings.
	 * Note: this is not to be exposed externally as an API.
	 *
	 * The column map specifies the LAMP object key to DB row column mapping.
	 * The default map specifies the LAMP object's value if none is found.
	 */
	private static jewelsMap(

		/**
		 * The settings key to produce detail on.
		 */
		key: string,

		/**
		 * Either false for column mapping, or true for defaults mapping.
		 */
		variety: boolean = false 
	) {
		return (<any>(!variety ? {
			"beginner_seconds": "NoOfSeconds_Beg",
			"intermediate_seconds": "NoOfSeconds_Int",
			"advanced_seconds": "NoOfSeconds_Adv",
			"expert_seconds": "NoOfSeconds_Exp",
			"diamond_count": "NoOfDiamonds",
			"shape_count": "NoOfShapes",
			"bonus_point_count": "NoOfBonusPoints",
			"x_changes_in_level_count": "X_NoOfChangesInLevel",
			"x_diamond_count": "X_NoOfDiamonds",
			"y_changes_in_level_count": "Y_NoOfChangesInLevel",
			"y_shape_count": "Y_NoOfShapes",
		} : {
			"beginner_seconds": 0,
			"intermediate_seconds": 0,
			"advanced_seconds": 0,
			"expert_seconds": 0,
			"diamond_count": 0,
			"shape_count": 0,
			"bonus_point_count": 0,
			"x_changes_in_level_count": 0,
			"x_diamond_count": 0,
			"y_changes_in_level_count": 0,
			"y_shape_count": 0,
		}))[key]
	}
}
