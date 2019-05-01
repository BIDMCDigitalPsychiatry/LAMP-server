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

// TODO: REMOVE ID!

// FIXME
type JSONSchema = any;

@Schema()
@Parent(Study)
@Description(d`
	The ActivitySpec determines the parameters and properties of an
	Activity and its corresponding generated ResultEvents.
`)
export class ActivitySpec {

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
		The static data definition of an ActivitySpec.
	`)
	public static_data_schema?: JSONSchema

	@Property()
	@Description(d`
		The temporal event data definition of an ActivitySpec.
	`)
	public temporal_event_schema?: JSONSchema

	@Property()
	@Description(d`
		The Activity settings definition of an ActivitySpec.
	`)
	public settings_schema?: JSONSchema

	@Route.POST('/activity_spec') 
	@Description(d`
		Create a new ActivitySpec.
	`)
	@Auth(Ownership.Root)
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Body()
		activity_spec: ActivitySpec,

	): Promise<Identifier> {
		return ActivitySpec._insert(activity_spec)
	}

	@Route.PUT('/activity_spec/{activity_spec_name}') 
	@Description(d`
		Update an ActivitySpec.
	`)
	@Auth(Ownership.Root)
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('activity_spec_name')
		@Retype(Identifier, ActivitySpec)
		activity_spec_name: string,

		@Body()
		activity_spec: ActivitySpec,

	): Promise<Identifier> {
		return ActivitySpec._update(activity_spec_name, activity_spec)
	}

	@Route.DELETE('/activity_spec/{activity_spec_name}') 
	@Description(d`
		Delete an ActivitySpec.
	`)
	@Auth(Ownership.Root)
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('activity_spec_name')
		@Retype(Identifier, ActivitySpec)
		activity_spec_name: string

	): Promise<Identifier> {
		return ActivitySpec._delete(activity_spec_name)
	}

	@Route.GET('/activity_spec/{activity_spec_name}') 
	@Description(d`
		View an ActivitySpec.
	`)
	@Auth(Ownership.Any)
	@Retype(Identifier, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('activity_spec_name')
		@Retype(String, ActivitySpec)
		activity_spec_name: string

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select(activity_spec_name)
	}

	@Route.GET('/activity_spec') 
	@Description(d`
		Get all ActivitySpecs registered.
	`)
	@Auth(Ownership.Any)
	@Retype(Array, ActivitySpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<ActivitySpec[]> {
		return ActivitySpec._select()
	}

	/**
	 * Get a set of `ActivitySpec`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * The identifier of the object or any parent.
		 */
		index_name?: String

	): Promise<ActivitySpec[]> {
		
		// Short-circuit to the batch spec if requested.
		if (index_name === 'lamp.activity_group')
			return [ActivitySpec.batchSpec]

		// Collect the set of legacy Activity tables and stitch the full query.
		let result = await SQL!.request().query(`
			SELECT 
	        	ActivityIndexID AS id,
	        	Name AS name
			FROM LAMP_Aux.dbo.ActivityIndex
			${!!index_name ? `WHERE ActivityIndexID = ${index_name}` : ''};
		`)

		// Convert fields correctly and return the spec objects.
		// Include the batchSpec only if a non-specific lookup was made.
		return [
			...(!!index_name ? [] : [ActivitySpec.batchSpec]),
			...result.recordsets[0].map(x => {
				let obj = new ActivitySpec()
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
		activity_spec_name: Identifier,

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
		activity_spec_name: Identifier

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
		obj.name = 'lamp.activity_group'
		obj.settings_schema = {
			type: 'object',
			properties: {
				item1: {
					type: 'string', /* switch to schema format */
					default: undefined /* null vs. 'null' */
				},
				item2: {
					type: 'string', /* switch to schema format */
					default: undefined /* null vs. 'null' */
				},
				item3: {
					type: 'string', /* switch to schema format */
					default: undefined /* null vs. 'null' */
				}
			}
		}
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

// TODO: The below are actually part of the JSONSchema for Survey's ActivitySpec

/*
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
*/
