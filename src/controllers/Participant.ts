import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Type } from './Type'
import { Study } from './Study'
import { Researcher } from './Researcher'

@Schema()
@Parent(Study)
@Description(d`
	A participant within a study; a participant cannot be enrolled in 
	more than one study at a time.
`)
export class Participant {
	
	@Property()
	@Description(d`
		The self-referencing identifier to this object.
	`)
	public id?: Identifier

	@Property()
	@Description(d`
		The researcher-provided study code for the participant.
	`)
	public study_code?: string

	@Property()
	@Description(d`
		The participant's selected language code for the LAMP app.
	`)
	public language?: string

	@Property()
	@Description(d`
		The participant's selected theme for the LAMP app.
	`)
	public theme?: string

	@Property()
	@Description(d`
		The participant's emergency contact number.
	`)
	public emergency_contact?: string

	@Property()
	@Description(d`
		The participant's selected personal helpline number.
	`)
	public helpline?: string

	@Route.POST('/study/{study_id}/participant') 
	@Description(d`
		Create a new Participant for the given Study.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Identifier, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string,

		@Body()
		participant: Participant,

	): Promise<Identifier> {
		return Participant._insert(study_id, participant)
	}

	@Route.PUT('/participant/{participant_id}') 
	@Description(d`
		Update a Participant's settings.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'participant_id')
	@Retype(Identifier, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string,

		@Body()
		participant: Participant,

	): Promise<{}> {
		return Participant._update(participant_id, participant)
	}

	@Route.DELETE('/participant/{participant_id}') 
	@Description(d`
		Delete a participant AND all owned data or event streams.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'participant_id')
	@Retype(Identifier, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string

	): Promise<{}> {
		return Participant._delete(participant_id)
	}

	@Route.GET('/participant/{participant_id}') 
	@Description(d`
		Get a single participant, by identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'participant_id')
	@Retype(Array, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async view(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string

	): Promise<Participant[]> {
		return Participant._select(participant_id)
	}

	@Route.GET('/study/{study_id}/participant') 
	@Description(d`
		Get the set of all participants in a single study.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'study_id')
	@Retype(Array, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_study(

		@Path('study_id')
		@Retype(Identifier, Study)
		study_id: string

	): Promise<Participant[]> {
		return Participant._select(study_id)
	}

	@Route.GET('/researcher/{researcher_id}/participant') 
	@Description(d`
		Get the set of all participants under a single researcher.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'researcher_id')
	@Retype(Array, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all_by_researcher(

		@Path('researcher_id')
		@Retype(Identifier, Researcher)
		researcher_id: string

	): Promise<Participant[]> {
		return Participant._select(researcher_id)
	}

	@Route.GET('/participant') 
	@Description(d`
		Get the set of all participants.
	`)
	@Auth(Ownership.Root)
	@Retype(Array, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async all(

	): Promise<Participant[]> {
		return Participant._select()
	}

	/**
	 *
	 */
	public static _pack_id(components: {

		/**
		 * 
		 */
		study_id?: string

	}): Identifier {
		return components.study_id || ''
	}

	/**
	 *
	 */
	public static _unpack_id(id: Identifier): ({

		/**
		 * 
		 */
		study_id: string

	}) {
		return { study_id: <string>id }
	}

	/**
	 *
	 */
	public static async _parent_id(id: Identifier, type: Function): Promise<Identifier | undefined> {
		let { study_id } = Participant._unpack_id(id)
		switch (type) {
			case Study:
			case Researcher: 
				let result = (await SQL!.request().query(`
                    SELECT AdminID AS value
                    FROM Users
                    WHERE IsDeleted = 0 AND StudyId = '${Encrypt(study_id)}';
				`)).recordset
				return result.length === 0 ? undefined : 
					(type === Researcher ? Researcher : Study)._pack_id({ admin_id: result[0].value })

			default: throw new Error()
		}
	}

	/**
	 * Get a set of `Participant`s matching the criteria parameters.
	 */
	private static async _select(

		/**
		 * 
		 */
		id?: Identifier

	): Promise<Participant[]> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Study).name)
			admin_id = Study._unpack_id(id).admin_id
		else if (!!id && Identifier.unpack(id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(id).study_id
		else if(!!id) throw new Error()

		// Collect the set of legacy Activity tables and stitch the full query.
		let activities_list = (await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
		`)).recordset

	    // Construct N sub-objects for each of N activities.
        // Perform complex lookup, returning a JSON object set.
	    let result = await SQL!.request().query(`
            SELECT 
                StudyId AS id, 
                StudyCode AS study_code, 
                AppColor AS [theme], 
                Language AS [language], 
                (
                    SELECT [24By7ContactNo]
                    WHERE [24By7ContactNo] != ''
                ) AS [emergency_contact],
                (
                    SELECT PersonalHelpline
                    WHERE PersonalHelpline != ''
                ) AS [helpline]
            FROM Users
            FULL OUTER JOIN UserSettings
                ON UserSettings.UserID = Users.UserID
            FULL OUTER JOIN UserDevices
                ON UserDevices.UserID = Users.UserID
            WHERE 
            	Users.IsDeleted = 0 
            	${!!user_id ? `AND Users.StudyId = '${Encrypt(user_id)}'` : ''} 
            	${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ''}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
	    `)

		if (result.recordset.length === 0 || !result.recordset[0])
			return []

        // Map from SQL DB to the local Participant type.
        return result.recordset[0].map((raw: any) => {
        	let obj = new Participant()
            obj.id = Decrypt(raw.id)
            obj.study_code = Decrypt(raw.study_code)
            obj.language = raw.language || 'en'
            obj.theme = !!raw.theme ? Decrypt(raw.theme!) : undefined
            obj.emergency_contact = raw.emergency_contact
            obj.helpline = raw.helpline

            // TODO: Legacy!! REMOVE!
            ;(<any>obj).settings = { study_code: obj.study_code || '' }
        	return obj
        })
	}

	/**
	 * Create a `Participant`.
	 */
	private static async _insert(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		study_id: Identifier,

		/**
		 * The patch fields of the `Participant` object. 
		 */
		object: Participant

	): Promise<any> {
		let admin_id = Study._unpack_id(study_id).admin_id

		// Create a fake email and study ID to allow login on the client app.
		let _id = 'U' + Math.floor(Math.random() * 100000000) /* rand(000000, 999999) */

		// Prepare the likely required SQL column changes as above.
		let study_code = !!object.study_code ? `'${Encrypt(object.study_code)}'` : 'NULL'
		let theme = !!object.theme ? `'${Encrypt(object.theme!)}'` : 'NULL'
		let language = !!object.language ? `'${Encrypt(object.language!)}'` : 'NULL'
		let emergency_contact = !!object.emergency_contact ? `'${Encrypt(object.emergency_contact!)}'` : 'NULL'
		let helpline = !!object.helpline ? `'${Encrypt(object.helpline!)}'` : 'NULL'

		// Insert row, returning the generated primary key ID.
		let result1 = await SQL!.request().query(`
			INSERT INTO Users (
                Email, 
                Password,
                StudyCode, 
                StudyId, 
                CreatedOn, 
                AdminID
            )
			VALUES (
		        '${Encrypt(_id + '@lamp.com')}', 
		        '',
		        ${study_code},
		        '${Encrypt(_id)}',
		        GETDATE(), 
		        ${admin_id}
			);
			SELECT SCOPE_IDENTITY() AS id;
		`)

		// Bail early if we failed to create a User row.
		if (result1.recordset.length === 0) 
			throw new Error()

		let result2 = await SQL!.request().query(`
            INSERT INTO UserSettings (
                UserID, 
                AppColor, 
                [24By7ContactNo], 
                PersonalHelpline,
                Language
            )
			VALUES (
			    ${(<any>result1.recordset)[0]['id']},
		        ${theme},
		        ${emergency_contact},
		        ${helpline},
		        ${language}
			);
		`);

		// Return the new row's ID.
		return { id: _id }
	}

	/**
	 * Update a `Participant` with new fields.
	 */
	private static async _update(

		/**
		 * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
		 */
		participant_id: Identifier, 

		/**
		 * The patch fields of the `Participant` object. 
		 */
		object: Participant

	): Promise<{}> {
		let user_id = Encrypt(Participant._unpack_id(participant_id).study_id)

		// Prepare the minimal SQL column changes from the provided fields.
		let updatesA = [], updatesB = []//, updatesC = []
		//if (!!((<any>object).password))
		//	updatesA.push(`'Password = '${Encrypt((<any>object).password, 'AES256') || 'NULL'}'`)
		if (!!object.study_code)
			updatesA.push(`StudyCode = '${Encrypt(object.study_code)}'`)
		if (!!object.theme)
			updatesB.push(`AppColor = '${Encrypt(object.theme!)}'`)
		if (!!object.language)
			updatesB.push(`Language = '${object.language!}'`)
		if (!!object.emergency_contact)
			updatesB.push(`24By7ContactNo = '${Encrypt(object.emergency_contact!)}'`)
		if (!!object.helpline)
			updatesB.push(`PersonalHelpline = '${Encrypt(object.helpline!)}'`)

		// Update the specified fields on the selected Users, UserSettings, or UserDevices row.
		let result1 = (await SQL!.request().query(`
            UPDATE Users 
            SET ${updatesA.join(', ')} 
            WHERE StudyId = ${user_id};
		`)).recordset

		let result2 = (await SQL!.request().query(`
            UPDATE UserSettings 
            SET ${updatesB.join(', ')} 
            LEFT JOIN Users ON Users.UserID = UserSettings.UserID 
            WHERE StudyId = ${user_id};
		`)).recordset

		// Return whether the operation was successful.
		return (result1.length && result2.length) ? {} : {}
	}

	/**
	 * Delete a `Participant`.
	 */
	private static async _delete(

		/**
		 * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
		 */
		participant_id: Identifier

	): Promise<{}> {
		let user_id = Encrypt(Participant._unpack_id(participant_id).study_id)

		// Set the deletion flag, without actually deleting the row.
		let res = (await SQL!.request().query(`
			IF EXISTS(SELECT UserID FROM Users WHERE StudyId = '${user_id}' AND IsDeleted != 1)
				UPDATE Users SET IsDeleted = 1 WHERE StudyId = '${user_id}';
		`))

		if (res.rowsAffected.length === 0 || res.rowsAffected[0] === 0)
			throw new NotFound()
		return {}
	}
}
