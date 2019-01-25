import { SQL, Encrypt, Decrypt } from '../index'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

import { Study } from './Study'
import { Researcher } from './Researcher'

import { FitnessEvent } from './FitnessEvent'
import { SensorEvent } from './SensorEvent'
import { EnvironmentEvent } from './EnvironmentEvent'
import { MetadataEvent } from './MetadataEvent'
import { ResultEvent } from './ResultEvent'

export enum DeviceType {
	iOS = 'iOS',
	Android = 'Android'
}
Enum(DeviceType, d`
	The kind of device a participant is using.
`)

@Schema()
@Description(d`
	The settings or health information about a participant.
`)
export class ParticipantSettings {

	@Property()
	@Description(d`
		The participant's selected theme for the LAMP app.
	`)
	public theme?: string

	@Property()
	@Description(d`
		The participant's selected language code for the LAMP app.
	`)
	public language?: string

	@Property()
	@Description(d`
		The date and time when the participant last used the LAMP app.
	`)
	public last_login?: Timestamp

	@Property()
	@Description(d`
		The type of device the participant last used to use to the LAMP app.
	`)
	public device_type?: DeviceType

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

	@Property()
	@Description(d`
		The date and time when the participant last checked the Blogs page.
	`)
	public blogs_checked_date?: Timestamp

	@Property()
	@Description(d`
		The date and time when the participant last checked the Tips page.
	`)
	public tips_checked_date?: Timestamp
}

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
		External or out-of-line objects attached to this object.
	`)
	public attachments?: any

	@Property()
	@Description(d`
		The researcher-provided study code for the participant.
	`)
	public study_code?: string

	@Property()
	@Description(d`
		The settings and information for the participant.
	`)
	public settings?: ParticipantSettings

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all result events from the participant.
	`)
	public result_events?: Identifier[]

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all metadata events from the participant.
	`)
	public metadata_events?: Identifier[]

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all sensor events from the participant.
	`)
	public sensor_events?: Identifier[]

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all environment events from the participant.
	`)
	public environment_events?: Identifier[]

	@Property()
	@Retype(Array, Identifier)
	@Description(d`
		The set of all fitness events from the participant.
	`)
	public fitness_events?: Identifier[]

	@Route.POST('/study/{study_id}/participant') 
	@Description(d`
		Create a new Participant for the given Study.
	`)
	@Auth(Ownership.Parent, 'study_id')
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
	@Auth(Ownership.Self, 'participant_id')
	@Retype(Identifier, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string,

		@Body()
		participant: Participant,

	): Promise<Identifier> {
		return Participant._update(participant_id, participant)
	}

	@Route.DELETE('/participant/{participant_id}') 
	@Description(d`
		Delete a participant AND all owned data or event streams.
	`)
	@Auth(Ownership.Self, 'participant_id')
	@Retype(Identifier, Participant)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('participant_id')
		@Retype(Identifier, Participant)
		participant_id: string

	): Promise<Identifier> {
		return Participant._delete(participant_id)
	}

	@Route.GET('/participant/{participant_id}') 
	@Description(d`
		Get a single participant, by identifier.
	`)
	@Auth(Ownership.Self, 'participant_id')
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
	@Auth(Ownership.Self, 'study_id')
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
	@Auth(Ownership.Self, 'researcher_id')
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

		console.dir(Identifier.unpack(id!))

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
                AppColor AS [settings.theme], 
                Language AS [settings.language], 
                DATEDIFF_BIG(MS, '1970-01-01', LastLoginOn) AS [settings.last_login],
                (CASE 
                    WHEN DeviceType = 1 THEN 'iOS'
                    WHEN DeviceType = 2 THEN 'Android'
                    ELSE NULL
                END) AS [settings.device_type],
                (
                    SELECT [24By7ContactNo]
                    WHERE [24By7ContactNo] != ''
                ) AS [settings.emergency_contact],
                (
                    SELECT PersonalHelpline
                    WHERE PersonalHelpline != ''
                ) AS [settings.helpline], 
                (
                    SELECT DATEDIFF_BIG(MS, '1970-01-01', BlogsViewedOn)
                    WHERE BlogsViewedOn IS NOT NULL
                ) AS [settings.blogs_checked_date],
                (
                    SELECT DATEDIFF_BIG(MS, '1970-01-01', TipsViewedOn)
                    WHERE TipsViewedOn IS NOT NULL
                ) AS [settings.tips_checked_date],
                ${activities_list.map(entry => `
            	(
	                SELECT 
	                    (${entry.ActivityIndexID}) AS ctid,
	                    [${entry.IndexColumnName}] AS id
	                FROM ${entry.TableName}
	                WHERE ${entry.TableName}.UserID = Users.UserID
	                FOR JSON PATH, INCLUDE_NULL_VALUES
            	) AS [rst_grp_${entry.ActivityIndexID}],
            	`).join('')}
                (
                    SELECT HKDailyValueID AS id
                    FROM HealthKit_DailyValues
                    WHERE HealthKit_DailyValues.UserID = Users.UserID
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS hkevents,
                (
                    SELECT LocationID AS id
                    FROM Locations
                    WHERE Locations.UserID = Users.UserID
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS locations
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

		if (result.recordset.length === 0)
			return []

        // Map from SQL DB to the local Participant type.
        return result.recordset[0].map((raw: any) => {
        	let obj = new Participant()

	        // A weird reverse-map + array-splat to group all result rows together.
	        // FIXME: SurveyID is missing!
	        let rst_grp_all = [].concat(...activities_list
	        					.map(entry => raw['rst_grp_' + entry['ActivityIndexID']] || []))

            obj.id = Decrypt(raw.id)
            obj.study_code = Decrypt(raw.study_code)
            obj.settings = raw.settings || {}
            obj.settings!.theme = !!obj.settings!.theme ? Decrypt(obj.settings!.theme!) : undefined

            obj.fitness_events = (raw.hkevents || []).map((x: any) => FitnessEvent._pack_id({ event_id: x.id }))
            obj.environment_events = (raw.locations || []).map((x: any) => EnvironmentEvent._pack_id({ event_id: x.id }))
            obj.result_events = (rst_grp_all || []).map((x: any) => ResultEvent._pack_id({ ctest_id: x.ctid, event_id: x.id }))
            obj.metadata_events = []
            obj.sensor_events = []
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
		 * Only `settings` and `password` are supported.
		 */
		object: Participant

	): Promise<any> {

		let admin_id = Study._unpack_id(study_id).admin_id
		let insert_object = object.settings

		// Terminate the operation if any of the required valid string-typed fields are not present.
		if (typeof ((<any>object).password) !== 'string')
			throw new Error();

		// Create a fake email and study ID to allow login on the client app.
		let _id = 'U' + (Math.random() * 1000000) /* rand(000000, 999999) */
		let study_id2 = Encrypt(_id)
		let email = Encrypt(Math.random().toString(26).slice(2) + '@lamp.com')

		// Prepare the likely required SQL column changes as above.
		let password = Encrypt((<any>object).password, 'AES256')
		let study_code = !!object.study_code ? Encrypt(object.study_code) : 'NULL'

		// Prepare the minimal SQL column changes from the provided fields.
		let theme = !!object.settings!.theme ? Encrypt(object.settings!.theme!) : 'NULL'
		let language = !!object.settings!.language ? Encrypt(object.settings!.language!) : 'NULL'
		let emergency_contact = !!object.settings!.emergency_contact ? Encrypt(object.settings!.emergency_contact!) : 'NULL'
		let helpline = !!object.settings!.helpline ? Encrypt(object.settings!.helpline!) : 'NULL'

		// Part Two: Devices! FIXME TIMESTAMP!
		let last_login = !!object.settings!.last_login ? Encrypt('' + object.settings!.last_login!) : 'NULL'
		let device_type = !!object.settings!.device_type ? Encrypt(object.settings!.device_type!) : 'NULL'

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
            OUTPUT INSERTED.UserID AS id
			VALUES (
		        '${email}',
		        '${password}',
		        '${study_code}',
		        '${study_id2}',
		        GETDATE(), 
		        ${admin_id}
			);
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
			    ${(<any>result1.recordset)['id']},
		        '${theme}',
		        '${emergency_contact}',
		        '${helpline}',
		        '${language}'
			);
		`)

		let result3 = await SQL!.request().query(`
            INSERT INTO UserDevices (
                UserID, 
                DeviceType, 
                LastLoginOn
            )
			VALUES (
			    ${(<any>result1.recordset)['id']},
		        '${device_type}'
		        '${last_login}',
			);
		`)

		// Return the new row's ID.
		return (result1.recordsets && result2.recordsets && result3.recordsets) ? { id: (<any>result1.recordset)['id'] } : null;
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
		 * Only `settings` and `password` are supported.
		 */
		object: Participant

	): Promise<Identifier> {

		let user_id = Participant._unpack_id(participant_id).study_id
		user_id = Encrypt(user_id) || user_id

		// Prepare the minimal SQL column changes from the provided fields.
		let updatesA = [], updatesB = [], updatesC = []
		if (!!((<any>object).password))
			updatesA.push(`'Password = '${Encrypt((<any>object).password, 'AES256') || 'NULL'}'`)
		if (!!object.study_code)
			updatesA.push(`StudyCode = '${Encrypt(object.study_code)}'`)
		if (!!object.settings!.theme)
			updatesB.push(`AppColor = '${Encrypt(object.settings!.theme!)}'`)
		if (!!object.settings!.language)
			updatesB.push(`Language = '${object.settings!.language!}'`)
		if (!!object.settings!.last_login)
			updatesC.push(`LastLoginOn = '${object.settings!.last_login!}'`)
		if (!!object.settings!.device_type)
			updatesC.push(`DeviceType = '${object.settings!.device_type!}'`)
		if (!!object.settings!.emergency_contact)
			updatesB.push(`24By7ContactNo = '${Encrypt(object.settings!.emergency_contact!)}'`)
		if (!!object.settings!.helpline)
			updatesB.push(`PersonalHelpline = '${Encrypt(object.settings!.helpline!)}'`)

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

		let result3 = (await SQL!.request().query(`
            UPDATE UserDevices 
            SET ${updatesC.join(', ')} 
            LEFT JOIN Users ON Users.UserID = UserDevices.UserID
            WHERE StudyId = ${user_id};
		`)).recordset

		// Return whether the operation was successful.
		return (result1.length && result2.length && result3.length) ? 'ok' : 'no'
	}

	/**
	 * Delete a `Participant`.
	 */
	private static async _delete(

		/**
		 * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
		 */
		participant_id: Identifier

	): Promise<Identifier> {

		let user_id = Participant._unpack_id(participant_id).study_id

		// Set the deletion flag, without actually deleting the row.
		return (await SQL!.request().query(`
			UPDATE Users SET IsDeleted = 1 WHERE StudyId = ${Encrypt(user_id)};
		`)).recordset[0]
	}
}
