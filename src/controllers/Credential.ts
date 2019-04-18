import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import sql from 'mssql'

import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'

@Schema()
@Description(d`
	Every object can have one or more credential(s) associated with it.
	i.e. my_researcher.credentials = ['person A', 'person B', 'api A', 'person C', 'api B']
`)
export class Credential {

	@Property()
	@Description(d`
		The root object this credential is attached to.
		The scope of this credential is limited to the object itself and any children.
	`)
	public origin: string = ''

	@Property()
	@Description(d`
		Username or machine-readable public key (access).
	`)
	public access_key: string = ''

	@Property()
	@Description(d`
		SALTED HASH OF Password or machine-readable private key (secret).
	`)
	public secret_key: string = ''

	@Property()
	@Description(d`
		The user-visible description of the credential.
	`)
	public description: string = ''

	@Route.GET('/type/{type_id}/credential') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list(

		@Path('type_id')
		type_id: Identifier

	): Promise<string[]> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier.unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier.unpack(type_id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error()

		// Get the legacy credential.
		let legacy_key: Credential | undefined = undefined
		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				SELECT Email
				FROM Admin
				WHERE IsDeleted = 0 
					AND Password != ''
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
				WHERE isDeleted = 0 
					AND Password != ''
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

	@Route.POST('/type/{type_id}/credential') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create(

		@Path('type_id')
		type_id: Identifier,

		@Body()
		credential: any

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier.unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier.unpack(type_id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error()

		// If it's not our credential, don't mess with it!
		if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
			throw new NotFound()

		if (!!admin_id) {

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND Password = ''
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] === 0)
				throw new NotFound()

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE isDeleted = 0 
					AND Password = ''
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new NotFound()
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
				throw new NotFound()
		}
		return {}
	}

	@Route.PUT('/type/{type_id}/credential/{access_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async update(

		@Path('type_id')
		type_id: Identifier,

		@Path('access_key')
		access_key: string,

		@Body()
		credential: any

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier.unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier.unpack(type_id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error()

		// If it's not our credential, don't mess with it!
		if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
			throw new BadRequest()

		if (!!admin_id) {
			console.log('route admin')

			// Reset the legacy/default credential as a Researcher. 
			let result = (await SQL!.request().query(`
				UPDATE Admin 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE IsDeleted = 0 
					AND Password != ''
					AND AdminID = ${admin_id};
			`))
			if (result.rowsAffected[0] === 0)
				throw new NotFound()

		} else if (!!user_id) {
			console.log('route user')

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET 
					Email = '${Encrypt(credential.access_key)}',
					Password = '${Encrypt(credential.secret_key, 'AES256')}'
				WHERE isDeleted = 0 
					AND Password != ''
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new NotFound()
		} else {
			console.log('route missing')
			throw new NotFound()

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
				throw new NotFound()
			*/
		}
		return {}
	}

	@Route.DELETE('/type/{type_id}/credential/{access_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete(

		@Path('type_id')
		type_id: Identifier,

		@Path('access_key')
		access_key: string

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier.unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier.unpack(type_id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error()

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
				throw new NotFound()

		} else if (!!user_id) {

			// Reset the legacy/default credential as a Participant.
			let result = (await SQL!.request().query(`
				UPDATE Users 
				SET Password = '' 
				WHERE isDeleted = 0 
					AND Email = '${Encrypt(access_key)}'
					AND StudyId = '${Encrypt(user_id)}';
			`))
			if (result.rowsAffected[0] === 0)
				throw new NotFound()
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
				throw new NotFound()
		}
		return {}
	}
}
