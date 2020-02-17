import { SQL, Encrypt, Decrypt } from '../app'
import { IResult } from 'mssql'
import { Participant } from '../model/Participant'
import { Study } from '../model/Study'
import { Researcher } from '../model/Researcher'
import { ActivitySpec } from '../model/ActivitySpec'
import { Identifier_unpack, Identifier_pack } from '../repository/TypeRepository'

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

export class ActivitySpecRepository {

	/**
	 * Get a set of `ActivitySpec`s matching the criteria parameters.
	 */
	public static async _select(

		/**
		 * The identifier of the object or any parent.
		 */
		index_name?: String

	): Promise<ActivitySpec[]> {
		
		// Short-circuit to the batch spec if requested.
		if (index_name === 'lamp.group')
			return [ActivitySpecRepository.batchSpec]

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
			...(!!index_name ? [] : [ActivitySpecRepository.batchSpec]),
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
	public static async _insert(

		/**
		 * The new object.
		 */
		object: ActivitySpec

	): Promise<string> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Update a `ActivitySpec` with new fields.
	 */
	public static async _update(

		/**
		 * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
		 */
		activity_spec_name: string,

		/**
		 * The replacement object or specific fields within.
		 */
		object: ActivitySpec

	): Promise<string> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Delete a `ActivitySpec` row.
	 */
	public static async _delete(

		/**
		 * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
		 */
		activity_spec_name: string

	): Promise<string> {

		// TODO: ActivitySpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * The ActivitySpec with ID = 0 is specially known as the "batch spec."
	 */
	private static get batchSpec() {
		let obj = new ActivitySpec()
		obj.name = 'lamp.group'
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
