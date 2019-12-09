import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body
} from '../utils/OpenAPI'
import { IResult } from 'mssql'
import SchemaList from '../utils/migrator/schema.json'

import { Type } from './Type'
import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'

// FIXME
type JSONSchema = any;

@Schema()
@Parent(Study)
@Description(d`
	The SensorSpec determines the parameters of generated SensorEvents.
`)
export class SensorSpec {

	@Property()
	@Description(d`
		The name of the sensor.
	`)
	public name?: string

	@Property()
	@Description(d`
		The data definition of a SensorSpec.
	`)
	public settings_schema?: JSONSchema

	@Route.POST('/sensor_spec') 
	@Description(d`
		Create a new SensorSpec.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Identifier, SensorSpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Body()
		sensor_spec: SensorSpec,

	): Promise<Identifier> {
		return SensorSpec._insert(sensor_spec)
	}

	@Route.PUT('/sensor_spec/{sensor_spec_name}') 
	@Description(d`
		Update an SensorSpec.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'sensor_spec_name')
	@Retype(Identifier, SensorSpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('sensor_spec_name')
		sensor_spec_name: string,

		@Body()
		sensor_spec: SensorSpec,

	): Promise<Identifier> {
		return SensorSpec._update(sensor_spec_name, sensor_spec)
	}

	@Route.DELETE('/sensor_spec/{sensor_spec_name}') 
	@Description(d`
		Delete an SensorSpec.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'sensor_spec_name')
	@Retype(Identifier, SensorSpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('sensor_spec_name')
		sensor_spec_name: string

	): Promise<Identifier> {
		return SensorSpec._delete(sensor_spec_name)
	}

	@Route.GET('/sensor_spec/{sensor_spec_name}') 
	@Description(d`
		Get a SensorSpec.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, SensorSpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('sensor_spec_name')
		sensor_spec_name: string

	): Promise<SensorSpec[]> {
		return SensorSpec._select(sensor_spec_name)
	}

	@Route.GET('/sensor_spec') 
	@Description(d`
		Get all SensorSpecs registered by any Researcher.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, SensorSpec)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<SensorSpec[]> {
		return SensorSpec._select()
	}

	/**
	 * Get a set of `SensorSpec`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * The identifier of the object or any parent.
		 */
		id?: Identifier

	): Promise<SensorSpec[]> {

		return SchemaList as any 
	}

	/**
	 * Create a `SensorSpec` with a new object.
	 */
	private static async _insert(

		/**
		 * The new object.
		 */
		object: SensorSpec

	): Promise<Identifier> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Update a `SensorSpec` with new fields.
	 */
	private static async _update(

		/**
		 * 
		 */
		sensor_spec_name: Identifier,

		/**
		 * The replacement object or specific fields within.
		 */
		object: SensorSpec

	): Promise<Identifier> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Delete a `SensorSpec` row.
	 */
	private static async _delete(

		/**
		 * 
		 */
		sensor_spec_name: Identifier

	): Promise<Identifier> {

		// TODO: SensorSpecs do not exist! They cannot be modified!
		throw new Error()
		return ''
	}
}
