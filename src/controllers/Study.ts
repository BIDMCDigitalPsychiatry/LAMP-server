import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Type } from './Type'
import { Activity } from './Activity'
import { Participant } from './Participant'
import { Researcher } from './Researcher'

@Schema()
@Parent(Researcher)
@Description(d`
	
`)
export class Study {
	
	@Property()
	@Description(d`
		The self-referencing identifier to this object.
	`)
	public id?: Identifier

	@Property()
	@Description(d`
		The name of the study.
	`)
	public name?: string

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all activities available in the study.
	`)
	public activities?: Identifier[]

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all enrolled participants in the study.
	`)
	public participants?: Identifier[]

	@Route.POST('/researcher/{researcher_id}/study') 
	@Description(d`
		Create a new Study for the given Researcher.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Identifier, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string,

		@Body()
		study: Study,

	): Promise<Identifier> {
		return Study._insert(researcher_id, study)
	}

	@Route.PUT('/study/{study_id}') 
	@Description(d`
		Update the study.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Identifier, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string,

		@Body()
		study: Study,

	): Promise<Identifier> {
		return Study._update(study_id, study)
	}

	@Route.DELETE('/study/{study_id}') 
	@Description(d`
		Delete a study.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Identifier, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string

	): Promise<Identifier> {
		return Study._delete(study_id)
	}

	@Route.GET('/study/{study_id}') 
	@Description(d`
		Get a single study, by identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Array, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string

	): Promise<Study[]> {
		return Study._select(study_id)
	}

	@Route.GET('/researcher/{researcher_id}/study') 
	@Description(d`
		Get the set of studies for a single researcher.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Array, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_researcher(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<Study[]> {
		return Study._select(researcher_id)
	}

	@Route.GET('/study') 
	@Description(d`
		Get the set of all studies.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, Study)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<Study[]> {
		return Study._select()
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
			(<any>Study).name, 
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
		if (components[0] !== (<any>Study).name)
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
		let { admin_id } = Study._unpack_id(id)
		switch (type) {
			case Researcher:
				return Researcher._pack_id({ admin_id: admin_id })
			default: throw new Error()
		}
	}

	/**
	 * Get a set of `Study`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * 
		 */
		id?: Identifier

	): Promise<Study[]> {

		// Get the correctly scoped identifier to search within.
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Study).name)
			admin_id = Study._unpack_id(id).admin_id
		else if(!!id) throw new Error()

		let result = await SQL!.request().query(`
			SELECT 
                Admin.AdminID AS id, 
                ('Default Study') AS name, 
                (
                    SELECT 
                        StudyId AS id
                    FROM Users
                    WHERE isDeleted = 0 
                        AND Users.AdminID = Admin.AdminID
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS participants,
                (
                    SELECT 
                        SurveyID AS id,
                        Admin.AdminID AS aid
                    FROM Survey
                    WHERE isDeleted = 0 
                        AND Survey.AdminID = Admin.AdminID
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS surveys,
                (
                    SELECT 
                        ActivityIndexID AS id,
                        Admin.AdminID AS aid
                    FROM LAMP_Aux.dbo.ActivityIndex
                    WHERE ActivityIndexID > 1
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS ctests
            FROM Admin
            LEFT JOIN Admin_Settings
                ON Admin_Settings.AdminID = Admin.AdminID
            WHERE 
            	isDeleted = 0 
            	${!!admin_id ? `AND Admin.AdminID = '${admin_id}'` : ''}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
		`)
		
		if (result.recordset.length === 0)
			return []

		return result.recordset[0].map((raw: any) => {
			let obj = new Study()
			obj.id = Study._pack_id({ admin_id: raw.id })
			obj.name = raw.name
			obj.participants = (raw.participants || []).map((x: any) => {
				return Decrypt(x.id)
			})
			obj.activities = [].concat(
				(raw.surveys || []).map((x: any) => {
					return Activity._pack_id({ 
						activity_spec_id: 1 /* survey */, 
						admin_id: <number>x.aid, 
						survey_id: <number>x.id 
					})
				}), 
				(raw.ctests || []).map((x: any) => {
					return Activity._pack_id({ 
						activity_spec_id: <number>x.id, 
						admin_id: <number>x.aid, 
						survey_id: 0 /* SurveyID */ 
					})
				})
			)
			return obj
		})
	}

	/**
	 * Create a `Study` with a new object.
	 */
	private static async _insert(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		researcher_id: Identifier,

		/**
		 * The new object.
		 */
		object: Study

	): Promise<Identifier> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Update a `Study` with new fields.
	 */
	private static async _update(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		study_id: Identifier,

		/**
		 * The replacement object or specific fields within.
		 */
		object: Study

	): Promise<Identifier> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error()
		return ''
	}

	/**
	 * Delete a `Study` row.
	 */
	private static async _delete(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		study_id: Identifier

	): Promise<Identifier> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error()
		return ''
	}
}