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

// TODO: Credential.delete -> promote tag credential to legacy credential to allow login!

export class CredentialRepository {

	// DANGER: This decrypts and dumps EVERY SINGLE CREDENTIAL!!! DO NOT USE EXCEPT FOR DEBUGGING!
	public static async _showAll(): Promise<any[]> {

		// Reset the legacy/default credential as a Researcher. 
		let result1 = (await SQL!.request().query(`
			SELECT AdminID, Email, Password
			FROM Admin
			WHERE IsDeleted = 0
		;`))

		let out1 = result1.recordset.map(x => ({
			origin: ResearcherRepository._pack_id({ admin_id: parseInt(x['AdminID']) }),
			access_key: Decrypt(x['Email']),
			secret_key: Decrypt(x['Password'], 'AES256'),
			description: 'Default Credential'
		}))

		// Reset the legacy/default credential as a Participant.
		let result2 = (await SQL!.request().query(`
			SELECT StudyId, Email, Password
			FROM Users
			WHERE IsDeleted = 0
		;`))

		let out2 = result2.recordset.map(x => ({
			origin: Decrypt(x['StudyId']),
			access_key: Decrypt(x['Email']),
			secret_key: Decrypt(x['Password'], 'AES256'),
			description: 'Default Credential'
		}))

		// Get any API credentials.
		let result3 = (await SQL!.request().query(`
            SELECT ObjectID, Value
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE ObjectType = 'Credential'
		;`))

		let out3 = result3.recordset
						.map(x => JSON.parse(x['Value']))
						.map(x => ({ ...x, secret_key: Decrypt(x.secret_key, 'AES256') }))
		return [...out1, ...out2, ...out3]
	}

	// if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
	public static async _find(

		access_key: string,

		secret_key?: string

	): Promise<string> {
		let result = null

		// Get any API credentials. 
		// Note: THIS MUST HAPPEN FIRST! If not, you will see email address conflicts with legacy accounts.
		result = (await SQL!.request().query(`
            SELECT ObjectID, Value
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
                	[Key] = '${access_key}'
                	AND ObjectType = 'Credential'
                )
		;`))
		if (result.rowsAffected[0] > 0) {
			if (!!secret_key && secret_key !== Decrypt(JSON.parse(result.recordset[0]['Value'])['secret_key'], 'AES256'))
				throw new Error('403.no-such-credentials')
			return result.recordset[0]['ObjectID']
		}

		// Reset the legacy/default credential as a Researcher. 
		result = (await SQL!.request().query(`
			SELECT AdminID, Password
			FROM Admin
			WHERE IsDeleted = 0 
				AND Email = '${Encrypt(access_key)}'
				AND (Password IS NOT NULL AND Password != '')
		;`))
		if (result.rowsAffected[0] > 0) {
			if (!!secret_key && secret_key !== Decrypt(result.recordset[0]['Password'], 'AES256'))
				throw new Error('403.no-such-credentials')
			return ResearcherRepository._pack_id({ admin_id: parseInt(result.recordset[0]['AdminID']) })
		}

		// Reset the legacy/default credential as a Participant.
		result = (await SQL!.request().query(`
			SELECT Email, StudyId, Password
			FROM Users
			WHERE IsDeleted = 0 
				AND Email = '${Encrypt(access_key)}'
				AND (Password IS NOT NULL AND Password != '')
		;`))
		if (result.rowsAffected[0] > 0) {
			if (!!secret_key && secret_key !== Decrypt(result.recordset[0]['Password'], 'AES256'))
				throw new Error('403.no-such-credentials')
			return <string>Decrypt(result.recordset[0]['StudyId'])
		}
		
		throw new Error('403.no-such-credentials')
	}

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
					AND AdminID = ${admin_id}
			;`))
			if (result.rowsAffected[0] > 0)
				legacy_key = {
					origin: <string>type_id,
					access_key: Decrypt(result.recordset[0]['Email']) || '',
					secret_key: null,
					description: 'Default Credential'
				}

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				SELECT Email
				FROM Users
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND StudyId = '${Encrypt(user_id)}'
			;`))
			if (result.rowsAffected[0] > 0)
				legacy_key = {
					origin: <string>type_id,
					access_key: Decrypt(result.recordset[0]['Email']) || '',
					secret_key: null,
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
                )
		;`)).recordset

		// 
		return [legacy_key, ...(result.map(x => JSON.parse(x['Value'])).map(x => ({ ...x, secret_key: null })))].filter(x => !!x)
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
					SELECT Email FROM Admin WHERE IsDeleted = 0 AND AdminID = ${admin_id}
				;`))
				credential.access_key = Decrypt(result.recordset[0]['Email'])
			} else if (!!user_id) {
				let result = (await SQL!.request().query(`
					SELECT Email FROM Users WHERE IsDeleted = 0 AND StudyId = '${Encrypt(user_id)}'
				;`))
				credential.access_key = Decrypt(result.recordset[0]['Email'])
			}
		}

		// If it's not our credential, don't mess with it!
		if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
			throw new Error('400.malformed-credential-object')

		let x
		try { x = await CredentialRepository._find(credential.access_key)
		} catch(e) {}
		if (!!x) throw new Error('403.access-key-already-in-use')

		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NULL OR Password = '')
					AND AdminID = ${admin_id}
			;`))
			if (result.rowsAffected[0] > 0)
				return {}

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NULL OR Password = '')
					AND StudyId = '${Encrypt(user_id)}'
			;`))
			if (result.rowsAffected[0] > 0)
				return {}
		}

		// Reset an API credential as either a Researcher or Participant.
		credential.secret_key = Encrypt(credential.secret_key, 'AES256')
		let req = SQL!.request()
		req.input('json_value', JSON.stringify(credential))
		let result = (await req.query(`
            INSERT INTO LAMP_Aux.dbo.OOLAttachment (
                ObjectType, ObjectID, [Key], Value
            )
            VALUES (
                'Credential', '${type_id}', '${credential.access_key}', @json_value
            )
		;`))
		if (result.rowsAffected[0] === 0)
			throw new Error('404.object-not-found')
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
			throw new Error("400.credential-requires-access-and-secret-keys")

		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND Email = '${Encrypt(credential.access_key)}'
					AND AdminID = ${admin_id}
			;`))
			if (result.rowsAffected[0] > 0)
				return {}

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND (Password IS NOT NULL AND Password != '')
					AND Email = '${Encrypt(credential.access_key)}'
					AND StudyId = '${Encrypt(user_id)}'
			;`))
			if (result.rowsAffected[0] > 0)
				return {}
		}

		// Reset an API credential as either a Researcher or Participant.
		credential.secret_key = Encrypt(credential.secret_key, 'AES256')
		let req = SQL!.request()
		req.input('json_value', JSON.stringify(credential))
		let result = (await req.query(`
            UPDATE LAMP_Aux.dbo.OOLAttachment SET
	            Value = @json_value
            WHERE ObjectType = 'Credential'
            	AND ObjectID = '${type_id}'
            	AND [Key] = '${credential.access_key}'
		;`))
		if (result.rowsAffected[0] === 0)
			throw new Error('404.object-not-found')
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
					AND AdminID = ${admin_id}
					AND (Password IS NOT NULL AND Password != '')
			;`))
			if (result.rowsAffected[0] > 0)
				return {}

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET Password = '' 
				WHERE IsDeleted = 0 
					AND Email = '${Encrypt(access_key)}'
					AND StudyId = '${Encrypt(user_id)}'
					AND (Password IS NOT NULL AND Password != '')
			;`))
			if (result.rowsAffected[0] > 0)
				return {}
		}

		// Reset an API credential as either a Researcher or Participant.
		let result = (await SQL!.request().query(`
	        DELETE FROM LAMP_Aux.dbo.OOLAttachment
            WHERE 
                ObjectID = '${type_id}'
                AND [Key] = '${access_key}'
                AND ObjectType = 'Credential'
		;`))
		if (result.rowsAffected[0] === 0)
			throw new Error('404.access-key-not-found')
		return {}
	}
}
