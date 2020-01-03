import { SQL, Encrypt, Decrypt } from '../app'
import { IResult } from 'mssql'
import { Activity } from '../model/Activity'
import { Participant } from '../model/Participant'
import { Study } from '../model/Study'
import { Researcher } from '../model/Researcher'
import { ResearcherRepository } from '../repository/ResearcherRepository'
import { ParticipantRepository } from '../repository/ParticipantRepository'
import { ActivityRepository } from '../repository/ActivityRepository'
import { Identifier_unpack, Identifier_pack } from '../repository/TypeRepository'

export class StudyRepository {

	/**
	 *
	 */
	public static _pack_id(components: {

		/**
		 * 
		 */
		admin_id?: number

	}): string {
		return Identifier_pack([
			(<any>Study).name, 
			components.admin_id || 0,
		])
	}

	/**
	 *
	 */
	public static _unpack_id(id: string): ({

		/**
		 * 
		 */
		admin_id: number

	}) {
		let components = Identifier_unpack(id)
		if (components[0] !== (<any>Study).name)
			throw new Error('400.invalid-identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			admin_id: !isNaN(result[0]) ? result[0] : 0
		}
	}

	/**
	 *
	 */
	public static async _parent_id(id: string, type: Function): Promise<string | undefined> {
		let { admin_id } = StudyRepository._unpack_id(id)
		switch (type) {
			case ResearcherRepository:
				return ResearcherRepository._pack_id({ admin_id: admin_id })
			default: throw new Error('400.invalid-identifier')
		}
	}

	/**
	 * Get a set of `Study`s matching the criteria parameters.
	 */
	public static async _select(

		/**
		 * 
		 */
		id?: string

	): Promise<Study[]> {

		// Get the correctly scoped identifier to search within.
		let admin_id: number | undefined
		if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
			admin_id = ResearcherRepository._unpack_id(id).admin_id
		else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name)
			admin_id = StudyRepository._unpack_id(id).admin_id
		else if(!!id) throw new Error('400.invalid-identifier')

		let result = await SQL!.request().query(`
			SELECT 
                Admin.AdminID AS id, 
                ('Default Study') AS name, 
                (
                    SELECT 
                        StudyId AS id
                    FROM Users
                    WHERE IsDeleted = 0 
                        AND Users.AdminID = Admin.AdminID
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS participants,
                (
                    SELECT 
                        SurveyID AS id,
                        Admin.AdminID AS aid
                    FROM Survey
                    WHERE IsDeleted = 0 
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
            	IsDeleted = 0 
            	${!!admin_id ? `AND Admin.AdminID = '${admin_id}'` : ''}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
		`)
		
		if (result.recordset.length === 0)
			return []

		return result.recordset[0].map((raw: any) => {
			let obj = new Study()
			obj.id = StudyRepository._pack_id({ admin_id: raw.id })
			obj.name = raw.name
			obj.participants = (raw.participants || []).map((x: any) => {
				return Decrypt(x.id)
			})
			obj.activities = [].concat(
				(raw.surveys || []).map((x: any) => {
					return ActivityRepository._pack_id({ 
						activity_spec_id: 1 /* survey */, 
						admin_id: <number>x.aid, 
						survey_id: <number>x.id 
					})
				}), 
				(raw.ctests || []).map((x: any) => {
					return ActivityRepository._pack_id({ 
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
	public static async _insert(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		researcher_id: string,

		/**
		 * The new object.
		 */
		object: Study

	): Promise<string> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Update a `Study` with new fields.
	 */
	public static async _update(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		study_id: string,

		/**
		 * The replacement object or specific fields within.
		 */
		object: Study

	): Promise<string> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}

	/**
	 * Delete a `Study` row.
	 */
	public static async _delete(

		/**
		 * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
		 */
		study_id: string

	): Promise<string> {

		// TODO: Studies do not exist! They cannot be modified!
		throw new Error('503.unimplemented')
		return ''
	}
}