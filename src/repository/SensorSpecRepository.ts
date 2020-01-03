import { SQL, Encrypt, Decrypt } from '../app'
import { IResult } from 'mssql'
import SchemaList from '../utils/schema.json'
import { Participant } from '../model/Participant'
import { SensorSpec } from '../model/SensorSpec'
import { Study } from '../model/Study'
import { Researcher } from '../model/Researcher'
import { Identifier_unpack, Identifier_pack } from '../repository/TypeRepository'

// FIXME
type JSONSchema = any;

export class SensorSpecRepository {

	/**
	 * Get a set of `SensorSpec`s matching the criteria parameters.
	 */
	public static async _select(

		/**
		 * The identifier of the object or any parent.
		 */
		id?: string

	): Promise<SensorSpec[]> {

		return SchemaList as any 
	}

	/**
	 * Create a `SensorSpec` with a new object.
	 */
	public static async _insert(

		/**
		 * The new object.
		 */
		object: SensorSpec

	): Promise<string> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Update a `SensorSpec` with new fields.
	 */
	public static async _update(

		/**
		 * 
		 */
		sensor_spec_name: string,

		/**
		 * The replacement object or specific fields within.
		 */
		object: SensorSpec

	): Promise<string> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Delete a `SensorSpec` row.
	 */
	public static async _delete(

		/**
		 * 
		 */
		sensor_spec_name: string

	): Promise<string> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}
}
