import { Request, Response } from 'express'
import { SQL, Encrypt, Decrypt } from '../app'
import sql from 'mssql'
import { Participant } from '../model/Participant'
import { Study } from '../model/Study'
import { Researcher } from '../model/Researcher'
import { Credential } from '../model/Credential'
import { ResearcherRepository } from '../repository/ResearcherRepository'
import { ParticipantRepository } from '../repository/ParticipantRepository'
import { Identifier_unpack, Identifier_pack } from '../repository/TypeRepository'

export class CredentialRepository {

	public static async _select(

		type_id: string

	): Promise<string[]> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier_unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = ResearcherRepository._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier_unpack(type_id).length === 0 /* Participant */)
			user_id = ParticipantRepository._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error('400.invalid-identifier')

		// Get the legacy credential.
		let legacy_key: Credential | undefined = undefined
		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				SELECT Email
				FROM Admin
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] > 0)
				legacy_key = {
					origin: <string>type_id,
					access_key: Decrypt(result.recordset[0]['Email']) || '',
					secret_key: '',
					description: 'Default Credential'
				}

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				SELECT Email
				FROM Users
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] > 0)
				legacy_key = {
					origin: <string>type_id,
					access_key: Decrypt(result.recordset[0]['Email']) || '',
					secret_key: '',
					description: 'Default Credential'
				}
		}

		// Get any API credentials.
		let result = (await SQL!.request().query(`
            SELECT [Key], Value
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'Credential'
                );
		`)).recordset

		// 
		return [legacy_key, ...(result.map(x => x['Value']))].filter(x => !!x)
	}

	public static async _insert(

		type_id: string,

		credential: any

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier_unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = ResearcherRepository._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier_unpack(type_id).length === 0 /* Participant */)
			user_id = ParticipantRepository._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error('400.invalid-identifier')

		// HOTFIX ONLY!
		if (typeof credential === 'string') {
			credential = {
				origin: type_id,
				access_key: '',
				secret_key: credential
			}
			if (!!admin_id) {
				let result = (await SQL!.request().query(`
					SELECT Email FROM Admin WHERE IsDeleted = 0 AND AdminID = ${admin_id};
				`))
				credential.access_key = Decrypt(result.recordset[0]['Email'])
			} else if (!!user_id) {
				let result = (await SQL!.request().query(`
					SELECT Email FROM Users WHERE IsDeleted = 0 AND StudyId = '${Encrypt(user_id)}';
				`))
				credential.access_key = Decrypt(result.recordset[0]['Email'])
			}
		}

		// If it's not our credential, don't mess with it!
		if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
			throw new Error('404.object-not-found')

		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NULL OR Password = '')
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NULL OR Password = '')
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
		} else {

			// Reset an API credential as either a Researcher or Participant.
			let req = SQL!.request()
			req.input('json_value', JSON.stringify(credential))
			let result = (await req.query(`
	            INSERT (
	                ObjectType, ObjectID, [Key], Value
	            )
	            VALUES (
	                'Credential', '${type_id}', '${credential.key}', @json_value
	            );
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
		}
		return {}
	}

	public static async _update(

		type_id: string,

		access_key: string,

		credential: any

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier_unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = ResearcherRepository._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier_unpack(type_id).length === 0 /* Participant */)
			user_id = ParticipantRepository._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error('400.invalid-identifier')

		// If it's not our credential, don't mess with it!
		//if (<string>(credential.origin) != <string>type_id)
		//	throw new BadRequest("The credential origin does not match the requested resource.")
		if (!credential.access_key || !credential.secret_key)
			throw new Error("400.A credential must have both access and secret keys.") /* bad-request */

		if (!!admin_id) {
			console.log('route admin')

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')

		} else if (!!user_id) {
			console.log('route user')

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
		} else {
			console.log('route missing')
			throw new Error('404.object-not-found')

			/*
			// Reset an API credential as either a Researcher or Participant.
			let req = SQL!.request()
			req.input('json_value', JSON.stringify(credential))
			let result = (await req.query(`
	            INSERT (
	                ObjectType, ObjectID, [Key], Value
	            )
	            VALUES (
	                'Credential', '${type_id}', '${credential.key}', @json_value
	            );
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
			*/
		}
		return {}
	}

	public static async _delete(

		type_id: string,

		access_key: string

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier_unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = ResearcherRepository._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier_unpack(type_id).length === 0 /* Participant */)
			user_id = ParticipantRepository._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error('400.invalid-identifier')

		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET Password = '' 
				WHERE IsDeleted = 0 
					AND Email = '${Encrypt(access_key)}'
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET Password = '' 
				WHERE IsDeleted = 0 
					AND Email = '${Encrypt(access_key)}'
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
		} else {

			// Reset an API credential as either a Researcher or Participant.
			let result = (await SQL!.request().query(`
		        DELETE FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE 
	                ObjectID = '${type_id}'
	                AND [Key] = '${access_key}'
	                AND ObjectType = 'Credential';
			`))
			if (result.rowsAffected[0] === 0)
				throw new Error('404.object-not-found')
		}
		return {}
	}
}
