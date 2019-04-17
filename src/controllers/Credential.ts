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
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list_credentials(

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

		// 

		let result = (await SQL!.request().query(`
            SELECT [Key], Value
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'Credential'
                );
		`)).recordset
		return result
	}

	@Route.POST('/type/{type_id}/credential') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async create_credential(

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

		//

		let req = SQL!.request()
		req.input('json_value', JSON.stringify(credential))
		let result = (await req.query(`
            INSERT (
                ObjectType, ObjectID, [Key], Value
            )
            VALUES (
                'Credential', '${type_id}', '${credential.key}', @json_value
            );
		`)).recordset
		if (result.length === 0)
			throw new NotFound()
		return {}
	}

	@Route.DELETE('/type/{type_id}/credential/{credential_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete_credential(

		@Path('type_id')
		type_id: Identifier,

		@Path('credential_key')
		credential_key: string

	): Promise<any> {

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!type_id && Identifier.unpack(type_id)[0] === (<any>Researcher).name)
			admin_id = Researcher._unpack_id(type_id).admin_id
		else if (!!type_id && Identifier.unpack(type_id).length === 0 /* Participant */)
			user_id = Participant._unpack_id(type_id).study_id
		else if(!!type_id) throw new Error()

		//

		let result = (await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.OOLAttachment
            WHERE 
                ObjectID = '${type_id}'
                AND [Key] = '${credential_key}'
                AND ObjectType = 'Credential';
		`)).recordset
		if (result.length === 0)
			throw new NotFound()
		return {}
	}
}
