import { SQL, Encrypt, Decrypt, Sysmail } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Type } from './Type'
import { Participant } from './Participant'
import { Study } from './Study'

@Schema()
@Parent(Parent.Root)
@Description(d`
	
`)
export class Researcher {
	
	@Property()
	@Description(d`
		The self-referencing identifier to this object.
	`)
	public id?: Identifier

	@Property()
	@Description(d`
		The name of the researcher.
	`)
	public name?: string

	@Property()
	@Description(d`
		The email address of the researcher.
	`)
	public email?: string

	@Property()
	@Description(d`
		The physical address of the researcher.
	`)
	public address?: string

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all studies conducted by the researcher.
	`)
	public studies?: Identifier[]

	@Route.POST('/researcher') 
	@Description(d`
		Create a new Researcher.
	`)
	@Auth(Ownership.Root)
	@Retype(Identifier, Researcher)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Body()
		researcher: Researcher,

	): Promise<Identifier> {
		return Researcher._insert(researcher)
	}

	@Route.PUT('/researcher/{researcher_id}') 
	@Description(d`
		Update a Researcher's settings.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Identifier, Researcher)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string,

		@Body()
		researcher: Researcher,

	): Promise<{}> {
		return Researcher._update(researcher_id, researcher)
	}

	@Route.DELETE('/researcher/{researcher_id}') 
	@Description(d`
		Delete a researcher.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Identifier, Researcher)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<{}> {
		return Researcher._delete(researcher_id)
	}

	@Route.GET('/researcher/{researcher_id}') 
	@Description(d`
		Get a single researcher, by identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Array, Researcher)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<Researcher[]> {
		return Researcher._select(researcher_id)
	}

	@Route.GET('/researcher') 
	@Description(d`
		Get the set of all researchers.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, Researcher)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<Researcher[]> {
		return Researcher._select()
	}

	/**
	 *
	 */
	public static _pack_id(components: {

		/**
		 * 
		 */
		admin_id?: number

	}): Identifier {
		return Identifier.pack([
			(<any>Researcher).name, 
			components.admin_id || 0,
		])
	}

	/**
	 *
	 */
	public static _unpack_id(id: Identifier): ({

		/**
		 * 
		 */
		admin_id: number

	}) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>Researcher).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			admin_id: !isNaN(result[0]) ? result[0] : 0
		}
	}

	/**
	 *
	 */
	public static async _parent_id(id: Identifier, type: Function): Promise<Identifier | undefined> {
		let { admin_id } = Researcher._unpack_id(id)
		switch (type) {
			default: return undefined // throw new Error()
		}
	}

	/**
	 *
	 */
	private static async _select(

		/**
		 * 
		 */
		id?: Identifier

	): Promise<Researcher[]> {

		// Get the correctly scoped identifier to search within.
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(id).admin_id
		else if(!!id) throw new Error()
		
		let result = await SQL!.request().query(`
			SELECT 
                AdminID as id, 
                FirstName AS name, 
                LastName AS lname,
                Email AS email,
                (
                    SELECT 
                        AdminID AS id
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS studies
            FROM Admin
            WHERE 
            	isDeleted = 0 
            	${!!admin_id ? `AND AdminID = '${admin_id}'` : ''}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
		`)
		if (result.recordset.length === 0 || result.recordset[0] === null)
			return []
		return result.recordset[0].map((raw: any) => {
			let obj = new Researcher()
			obj.id = Researcher._pack_id({ admin_id: raw.id })
			obj.name = [Decrypt(raw.name), Decrypt(raw.lname)].join(' ')
			obj.email = Decrypt(raw.email)
			obj.studies = raw.studies.map((x: any) => Study._pack_id({ admin_id: x.id }))
			return obj
		})
	}

	/**
	 * Create a `Researcher` with a new object.
	 */
	private static async _insert(

		/**
		 * The new object.
		 */
		object: Researcher

	): Promise<Identifier> {

		// Prepare SQL row-columns from JSON object-fields.
		//password: Encrypt((<any>object).password, 'AES256')
		let result = await SQL!.request().query(`
			INSERT INTO Admin (
                Email, 
                FirstName, 
                LastName, 
                CreatedOn, 
                AdminType
            )
            OUTPUT INSERTED.AdminID AS id
			VALUES (
		        '${Encrypt(object.email!)}',
		        '${Encrypt(object.name!.split(' ')[0])}',
		        '${Encrypt(object.name!.split(' ').slice(1).join(' '))}',
		        GETDATE(), 
		        2
			);
		`)
		if (result.recordset.length === 0)
			throw new Error('Could not create Researcher.')
		
		let result2 = await SQL!.request().query(`
			INSERT INTO Admin_CTestSettings (
				AdminID,
				CTestID,
				Status,
				Notification
			)
			SELECT
				${result.recordset[0]['id']},
				CTestID,
				0,
				0
			FROM CTest;
		`)

		// Return the new row's ID.
		return Researcher._pack_id({ admin_id: result.recordset[0]['id'] })
	}

	/**
	 * Update a `Researcher` with new fields.
	 */
	private static async _update(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		researcher_id: Identifier,

		/**
		 * The replacement object or specific fields within.
		 */
		object: Researcher

	): Promise<{}> {

		let admin_id = Researcher._unpack_id(researcher_id).admin_id

		// Prepare the minimal SQL column changes from the provided fields.
		let updates: string[] = []
		if (!!object.name) {
			updates.push(`FirstName = '${Encrypt(object.name.split(' ')[0])}'`)
			updates.push(`LastName = '${Encrypt(object.name.split(' ').slice(1).join(' '))}'`)
		}
		if (!!object.email)
			updates.push(`Email = '${Encrypt(object.email)}'`)
		//if (!!(<any>object).password)
		//	updates.push(`Password = '${Encrypt((<any>object).password, 'AES256')}'`)

		if (updates.length == 0)
			throw new Error()

		// Update the specified fields on the selected Admin row.
		let result = await SQL!.request().query(`
			UPDATE Admin SET ${updates.join(', ')} WHERE AdminID = ${admin_id};
		`)

		return {}//result.recordset[0]
	}

	/**
	 * Delete a `Researcher` row.
	 */
	private static async _delete(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		researcher_id: Identifier

	): Promise<{}> {

		let admin_id = Researcher._unpack_id(researcher_id).admin_id
		if (admin_id === 1)
			throw new Error('Could not delete this Researcher.')

		// Set the deletion flag, without actually deleting the row.
		let result = await SQL!.request().query(`
			UPDATE Admin SET IsDeleted = 1 WHERE AdminID = ${admin_id} AND IsDeleted = 0;
		`)
		if (result.rowsAffected[0] === 0)
			throw new Error('No such Researcher.')
		return {}
	}
}
