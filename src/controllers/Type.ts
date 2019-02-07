import { SQL, Encrypt, Decrypt } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { ScriptRunner } from '../utils'
import sql from 'mssql'

import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'
import { ActivitySpec } from './ActivitySpec'
import { Activity } from './Activity'

/* TODO: Researcher->Participant attachment overrides Participant->self? */
/* TODO: Support Credentials instead of id:pass authentication. */

/**
 * Every object can have one or more credential(s) associated with it.
 * i.e. `my_researcher.credentials = ['person A', 'person B', 'api A', 'person C', 'api B']`
 */
export class Credential {

	/**
     * The actual value of the credential. If an API key, this will be 
     * the key value; if a Password combination, this will be the username
     * and password as a JSON array.
     */
	public id: string = ''

    /**
     * The root object this credential is attached to.
     * The scope of this credential is limited to the object itself and any children.
     */
	public origin: string = ''

	/**
     * The user-visible name of the credential.
     */
	public name: string = ''

	/**
     * The user-visible description of the credential.
     */
	public description: string = ''
}

enum DynamicTrigger {
	once = 'once',
	each = 'each',
	onCreate = 'onCreate',
	onRead = 'onRead',
	onUpdate = 'onUpdate',
	onDelete = 'onDelete',
}
Enum(DynamicTrigger, d`
	The trigger types for an attachment.
`)
Enum.Description(DynamicTrigger, 'once', d`
	executes once
`)
Enum.Description(DynamicTrigger, 'each', d`
	executes each time the attachment's key is read
`)
Enum.Description(DynamicTrigger, 'onCreate', d`
	if a [to] is created (no-op for self)
`)
Enum.Description(DynamicTrigger, 'onRead', d`
	if [to](s) are read [!!!CURRENTLY DISABLED!!!]
`)
Enum.Description(DynamicTrigger, 'onUpdate', d`
	if [to](s) are updated
`)
Enum.Description(DynamicTrigger, 'onDelete', d`
	if [to](s) are deleted
`)

@Schema()
@Description(d`

`)
export class DynamicAttachment {

	@Property()
	@Description(d`
		The key.
	`)
	public key?: string

	@Property()
	@Description(d`
		The attachment owner.
	`)
	public from?: Identifier /* read-only? */

	@Property()
	@Description(d`
		Either "me" to apply to the attachment owner only, the ID of an object owned 
		by the attachment owner, or a string representing the child object type to apply to.
	`)
	public to?: string

	@Property()
	@Retype(Array, String)
	@Description(d`
		The API triggers that activate script execution. See \`DynamicTrigger\`.
	`)
	public triggers?: DynamicTrigger[]

	@Property()
	@Description(d`
		The script language.
	`)
	public language?: string

	@Property()
	@Description(d`
		The script contents.
	`)
	public contents?: string

	@Property()
	@Retype(Array, String)
	@Description(d`
		The script requirements.
	`)
	public requirements?: string[]

	// TODO
	public input_schema?: string /* JSONSchema */

	// TODO
	public output_schema?: string /* JSONSchema */
}

@Schema()
@Description(d`
	Runtime type specification for each object in the LAMP platform.
`)
export class Type {

	// TODO: SQL stuff here

	/**
	 * Get the self type of a given ID.
	 */
	public static _self_type(type_id: string): string {
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		return from_type
	}

	/**
	 * Get all parent types of a given ID.
	 */
	public static _parent_type(type_id: string): string[] {
		const parent_types: { [type: string]: string[] } = {
			Researcher: [],
			Study: ['Researcher'],
			Participant: ['Study', 'Researcher'],
			ActivitySpec: ['Study', 'Researcher'],
			Activity: ['ActivitySpec', 'Study', 'Researcher'],
		}
		return parent_types[Type._self_type(type_id)]
	}

	/**
	 * Get a single parent object ID for a given ID.
	 */
	public static async _parent_id(type_id: string, type: string): Promise<Identifier> {
		const self_type: { [type: string]: Function } = {
			Researcher: Researcher,
			Study: Study,
			Participant: Participant,
			ActivitySpec: ActivitySpec,
			Activity: Activity,
		}
		return await (<any>self_type[Type._self_type(type_id)])._parent_id(type_id, self_type[type])
	}

	@Route.GET('/type/{type_id}/parent') 
	@Description(d`
		Get the parent type identifier of the data structure referenced by the identifier.
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Retype(Identifier)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async parent(

		@Path('type_id')
		@Retype(Identifier)
		type_id: string

	): Promise<{}> {
		let result: any = {}
		for (let parent_type of Type._parent_type(type_id))
			result[parent_type] = await Type._parent_id(type_id, parent_type)
		return result 
	}

	@Route.GET('/type/{type_id}/credential') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list_credentials(

		@Path('type_id')
		type_id: Identifier

	): Promise<string[]> {
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

	@Route.GET('/type/{type_id}/attachment') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list_attachments(

		@Path('type_id')
		type_id: Identifier

	): Promise<string[]> {

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>type_id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		// Request all static attachments.
		let result = (await SQL!.request().query(`
            SELECT [Key]
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'me'
                ) OR (
                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
                	AND ObjectType IN ('${from_type}', '${type_id}')
                );
		`)).recordset

		// Request all dynamic attachments.
		let result2 = (await SQL!.request().query(`
            SELECT AttachmentKey
            FROM LAMP_Aux.dbo.OOLAttachmentLinker
            WHERE (
                	ObjectID = '${type_id}'
                	AND ChildObjectType = 'me'
                ) OR (
                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
                	AND ChildObjectType IN ('${from_type}', '${type_id}')
                );
		`)).recordset

		return (<string[]>[]).concat(
			result.map(x => x.Key), 
			result2.map(x => 'dynamic/' + x.AttachmentKey)
		)
	}

	@Route.GET('/type/{type_id}/attachment/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async get_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<any> {

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>type_id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		let result = (await SQL!.request().query(`
            SELECT TOP 1 * 
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE [Key] = '${attachment_key}'
                AND (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'me'
                ) OR (
                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
                	AND ObjectType IN ('${from_type}', '${type_id}')
                );
		`)).recordset

		if (result.length === 0)
			throw new NotFound()
		return JSON.parse(result[0].Value)
	}

	@Route.PUT('/type/{type_id}/attachment/{attachment_key}/{target}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async set_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('target')
		target: string,

		@Path('attachment_key')
		attachment_key: string,

		@Body()
		attachment_value: any,

	): Promise<{}> {

		// TODO: verify `target` is a valid id or 'me'
		// TODO: if target not provided, delete all!

		let result: sql.IResult<any>
		if (Object.keys(attachment_value).length === 0) /* DELETE */ {
			result = await SQL!.request().query(`
	            DELETE FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE 
	                ObjectID = '${type_id}'
	                AND [Key] = '${attachment_key}'
	                AND ObjectType = '${target}';
			`)
		} else /* INSERT or UPDATE */ {
			let req = SQL!.request()
			req.input('json_value', sql.NVarChar, JSON.stringify(attachment_value))
			result = await req.query(`
	            MERGE INTO LAMP_Aux.dbo.OOLAttachment
	                WITH (HOLDLOCK) AS Output
	            USING (SELECT
	                '${target}' AS ObjectType,
	                '${type_id}' AS ObjectID,
	                '${attachment_key}' AS [Key]
	            ) AS Input(ObjectType, ObjectID, [Key])
	            ON (
	                Output.[Key] = Input.[Key] 
	                AND Output.ObjectID = Input.ObjectID 
	                AND Output.ObjectType = Input.ObjectType 
	            )
	            WHEN MATCHED THEN 
	                UPDATE SET Value = @json_value
	            WHEN NOT MATCHED THEN 
	                INSERT (
	                    ObjectType, ObjectID, [Key], Value
	                )
	                VALUES (
	                    '${target}', '${type_id}', '${attachment_key}', @json_value
	                );
			`)
		}
		if (result.rowsAffected[0] === 0)
			throw new BadRequest()
		return {}
	}

	@Route.GET('/type/{type_id}/attachment/dynamic/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async get_dynamic_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<any> {

		// TODO
		//Type._trigger_scripts(type_id, DynamicTrigger.onRead)

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>type_id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		let result = (await SQL!.request().query(`
            SELECT TOP 1 * 
            FROM LAMP_Aux.dbo.OOLAttachmentLinker
            WHERE AttachmentKey = '${attachment_key}'
                AND (
                	ObjectID = '${type_id}'
                	AND ChildObjectType = 'me'
                ) OR (
                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
                	AND ChildObjectType IN ('${from_type}', '${type_id}')
                );
		`)).recordset

		if (result.length === 0)
			throw new NotFound()
		return result.map(x => {
			let script_type = x.ScriptType.startsWith('{') ? JSON.parse(x.ScriptType) : { triggers: [], language: x.ScriptType }

			let obj = new DynamicAttachment()
			obj.from = x.ObjectID
			obj.to = x.ChildObjectType
			obj.triggers = script_type.triggers
			obj.language = script_type.language
			obj.contents = x.ScriptContents
			obj.requirements = JSON.parse(x.ReqPackages)
			return obj
		})[0]
	}

	@Route.PUT('/type/{type_id}/attachment/dynamic/{attachment_key}/{target}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async set_dynamic_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('target')
		target: string,

		@Path('attachment_key')
		attachment_key: string,

		@Body()
		attachment_value: DynamicAttachment,

	): Promise<{}> {

		// TODO: verify `target` is a valid id or 'me'
		// TODO: if target not provided, delete all!

		let result: sql.IResult<any>
		if (Object.keys(attachment_value).length === 0) /* DELETE */ {
			result = await SQL!.request().query(`
	            DELETE FROM LAMP_Aux.dbo.OOLAttachmentLinker 
	            WHERE 
	                AttachmentKey = '${attachment_key}'
	                AND ObjectID = '${type_id}'
	                AND ChildObjectType = '${target}';
			`)
		} else /* INSERT or UPDATE */ {

			let { triggers, language, contents, requirements } = attachment_value
			let script_type = JSON.stringify({ language, triggers })
			let packages = JSON.stringify(requirements) || ''

			console.dir(attachment_value)

			let req = SQL!.request()
			req.input('script_contents', sql.NVarChar, contents)
			result = await req.query(`
	            MERGE INTO LAMP_Aux.dbo.OOLAttachmentLinker 
	                WITH (HOLDLOCK) AS Output
	            USING (SELECT
	                '${attachment_key}' AS AttachmentKey,
	                '${type_id}' AS ObjectID,
	                '${target}' AS ChildObjectType
	            ) AS Input(AttachmentKey, ObjectID, ChildObjectType)
	            ON (
	                Output.AttachmentKey = Input.AttachmentKey 
	                AND Output.ObjectID = Input.ObjectID 
	                AND Output.ChildObjectType = Input.ChildObjectType 
	            )
	            WHEN MATCHED THEN 
	                UPDATE SET 
	                	ScriptType = '${script_type}',
	                	ScriptContents = @script_contents, 
	                	ReqPackages = '${packages}'
	            WHEN NOT MATCHED THEN 
	                INSERT (
	                    AttachmentKey, ObjectID, ChildObjectType, 
	                    ScriptType, ScriptContents, ReqPackages
	                )
	                VALUES (
	                    '${attachment_key}', '${type_id}', '${target}',
	                    '${script_type}', @script_contents, '${packages}'
	                );
			`)

			console.dir(result)
		}
		if (result.rowsAffected[0] === 0)
			throw new BadRequest()
		return {}
	}

	@Route.GET('/type/{type_id}/attachment_trigger')
	@Description(d``)
	@Auth(Ownership.Root)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async _trigger_attachments(

		@Path('type_id')
		type_id: Identifier

	): Promise<any> {
		Type._trigger_scripts(type_id,
			DynamicTrigger.once,
			DynamicTrigger.each,
			DynamicTrigger.onCreate,
			DynamicTrigger.onRead,
			DynamicTrigger.onUpdate,
			DynamicTrigger.onDelete
		)
	}

	/**
	 *
	 */
	public static async _trigger_scripts(type_id: Identifier, ...triggers: DynamicTrigger[]): Promise<void> {

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>type_id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		// 
		let result = (await SQL!.request().query(`
            SELECT * 
            FROM LAMP_Aux.dbo.OOLAttachmentLinker
            WHERE (
                	ObjectID = '${type_id}'
                	AND ChildObjectType = 'me'
                ) OR (
                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
                	AND ChildObjectType IN ('${from_type}', '${type_id}')
                );
		`)).recordset
		if (result.length === 0) return

		// Convert all to DynamicAttachments.
		let attachments = result.map(x => {
			let script_type = x.ScriptType.startsWith('{') ? JSON.parse(x.ScriptType) : { triggers: [], language: x.ScriptType }

			let obj = new DynamicAttachment()
			obj.key = x.AttachmentKey
			obj.from = x.ObjectID
			obj.to = x.ChildObjectType
			obj.triggers = script_type.triggers
			obj.language = script_type.language
			obj.contents = x.ScriptContents
			obj.requirements = JSON.parse(x.ReqPackages)
			return obj
		})

		// 
		for (let attach of attachments) {
			if ((attach.triggers || []).filter(x => triggers.indexOf(x) >= 0).length === 0)
				continue
			if ((attach.contents || '').trim().length === 0)
				continue

			// Select script runner for the right language...
			let runner: ScriptRunner
			switch (attach.language) {
				case 'rscript': runner = new ScriptRunner.R(); break;
				case 'python': runner = new ScriptRunner.Py(); break;
				case 'javascript': runner = new ScriptRunner.JS(); break;
				case 'bash': runner = new ScriptRunner.Bash(); break;
				default: throw new Error()
			}

			// execute script and cache result. Insert/save the data.
			runner.execute(attach.contents!, attach.requirements!.join(','), {}).then((result) => {
				let req = SQL!.request()
				req.input('json_value', sql.NVarChar, JSON.stringify(result))
				return req.query(`
		            MERGE INTO LAMP_Aux.dbo.OOLAttachment
		                WITH (HOLDLOCK) AS Output
		            USING (SELECT
		                '${attach.to}' AS ObjectType,
		                '${attach.from}' AS ObjectID,
		                '${attach.key}/output' AS [Key]
		            ) AS Input(ObjectType, ObjectID, [Key])
		            ON (
		                Output.[Key] = Input.[Key] 
		                AND Output.ObjectID = Input.ObjectID 
		                AND Output.ObjectType = Input.ObjectType 
		            )
		            WHEN MATCHED THEN 
		                UPDATE SET Value = @json_value
		            WHEN NOT MATCHED THEN 
		                INSERT (
		                    ObjectType, ObjectID, [Key], Value
		                )
		                VALUES (
		                    '${attach.to}', '${attach.from}', '${attach.key}/output', @json_value
		                );
				`)
			}).catch(err => console.error(err))
		}
	}
}
