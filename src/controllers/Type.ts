import { SQL, Encrypt, Decrypt } from '../index'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import sql from 'mssql'

import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'

/* TODO/FIXME: Convert Timestamp <-> CalendarComponents. */
/* TODO: Restricted internet access whitelist in DynamicAttachment. */
// TODO: Researcher->Participant attachment overrides Participant->self?
// TODO: use nodejs Cluster or WorkerThread?







// FIXME
export function parent_of(type: string): string {
	return (<any>Object).name
}

// FIXME
export function type_parent_of(type: string): string[] {
	return [(<any>Object).name]
}






enum DynamicTrigger {
	once = 'once',
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
Enum.Description(DynamicTrigger, 'onCreate', d`
	if a [to] is created (no-op for self)
`)
Enum.Description(DynamicTrigger, 'onRead', d`
	if [to](s) are read
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

	@Route.GET('/type/{type_id}/parent') 
	@Description(d`
		Get the parent type identifier of the data structure referenced by the identifier.
	`)
	@Auth(Ownership.Self, 'type_id')
	@Retype(Identifier)
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async parent(

		@Path('type_id')
		@Retype(Identifier)
		type_id: string

	): Promise<Map<string, string>> {
		let components = Identifier.unpack(type_id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let to_type = type_parent_of(from_type)
		return to_type.reduce((prev, curr) => {
			prev.set(curr, parent_of(curr)); return prev
		}, new Map<string, string>())
	}

	@Route.GET('/type/{type_id}/attachment') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list_attachments(

		@Path('type_id')
		type_id: Identifier

	): Promise<string[]> {

		// Determine the parent type(s) of `type_id` first.
		let components = Buffer.from(<string>type_id, 'base64')
					   		   .toString('ascii').split(':')
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = [parent_of(from_type)].map(x => `'${x}'`).join(', ') //FIXME: RECURSIVE!!

		// Request all static attachments.
		let result = (await SQL!.request().query(`
            SELECT * 
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'me'
                ) OR (
                	ObjectID IN (${parents})
                	AND ObjectType = '${from_type}'
                );
		`)).recordset

		// Request all dynamic attachments.
		let result2 = (await SQL!.request().query(`
            SELECT * 
            FROM LAMP_Aux.dbo.OOLAttachmentLinker
            WHERE (
                	ObjectID = '${type_id}'
                	AND ChildObjectType = 'me'
                ) OR (
                	ObjectID IN (${parents})
                	AND ChildObjectType = '${from_type}'
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
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async get_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<any> {

		// Determine the parent type(s) of `type_id` first.
		let components = Buffer.from(<string>type_id, 'base64')
					   		   .toString('ascii').split(':')
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = [parent_of(from_type)].map(x => `'${x}'`).join(', ') //FIXME: RECURSIVE!!

		let result = (await SQL!.request().query(`
            SELECT TOP 1
                * 
            FROM LAMP_Aux.dbo.OOLAttachment
            WHERE [Key] = '${attachment_key}'
                AND (
                	ObjectID = '${type_id}'
                	AND ObjectType = 'me'
                ) OR (
                	ObjectID IN (${parents})
                	AND ObjectType = '${from_type}'
                );
		`)).recordset

		if (result.length === 0)
			throw new NotFound()
		return JSON.parse(result[0].Value)
	}

	@Route.POST('/type/{type_id}/attachment/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async set_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string,

		@Body()
		attachment_value: any,

	): Promise<{}> {

		let to = 'Legacy' // FIXME

		// Convert to JSON first.
		let req = SQL!.request()
		req.input('json_value', sql.NVarChar, JSON.stringify(attachment_value))
		let result = await req.query(`
            MERGE INTO LAMP_Aux.dbo.OOLAttachment
                WITH (HOLDLOCK) AS Output
            USING (SELECT
                '${to}' AS ObjectType,
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
                    '${to}', '${type_id}', '${attachment_key}', @json_value
                );
		`)

		if (result.rowsAffected[0] === 0)
			throw new BadRequest()
		return {}
	}

	@Route.DELETE('/type/{type_id}/attachment/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<{}> {

		let result = await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.OOLAttachment
            WHERE 
                ObjectID = '${type_id}'
                AND [Key] = '${attachment_key}';
		`)

		// FIXME: currently cannot assign same key to diff. sub-object types!
        //AND ChildObjectType = '${to}'

		if (result.rowsAffected[0] === 0)
			throw new NotFound()
		return {}
	}

	@Route.GET('/type/{type_id}/attachment/dynamic/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async get_dynamic_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<any> {

		// get:
		// - id = 111->111
		// - id = 111->*
		// - id = 111->222

		let result = (await SQL!.request().query(`
            SELECT TOP 1
                * 
            FROM LAMP_Aux.dbo.OOLAttachmentLinker
            WHERE 
                AttachmentKey = '${attachment_key}'
                AND ObjectID = '${type_id}'
                AND ChildObjectType = 'Legacy';
		`)).recordset

		if (result.length === 0)
			throw new NotFound()
		return result.map(x => {
			let script_type = JSON.parse(x.ScriptType)
			let obj = new DynamicAttachment()
			obj.from = x.ObjectID
			obj.to = x.ChildObjectType
			obj.triggers = script_type.triggers
			obj.language = script_type.language
			obj.contents = x.ScriptContents
			obj.requirements = JSON.parse(x.ReqPackages)
			return obj
		})
	}

	@Route.POST('/type/{type_id}/attachment/dynamic/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async set_dynamic_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string,

		@Body()
		attachment_value: DynamicAttachment,

	): Promise<{}> {
		let { to, triggers, language, contents, requirements } = attachment_value
		let script_type = JSON.stringify({ language, triggers })
		let packages = JSON.stringify(requirements) || ''

		let req = SQL!.request()
		req.input('script_contents', sql.NVarChar, contents)
		let result = await req.query(`
            MERGE INTO LAMP_Aux.dbo.OOLAttachmentLinker 
                WITH (HOLDLOCK) AS Output
            USING (SELECT
                '${attachment_key}' AS AttachmentKey,
                '${type_id}' AS ObjectID,
                '${to}' AS ChildObjectType
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
                    '${attachment_key}', '${type_id}', '${to}',
                    '${script_type}', @script_contents, '${packages}'
                );
		`)

		if (result.rowsAffected[0] === 0)
			throw new BadRequest()
		return {}
	}

	@Route.DELETE('/type/{type_id}/attachment/dynamic/{attachment_key}') 
	@Description(d`
		
	`)
	@Auth(Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async delete_dynamic_attachment(

		@Path('type_id')
		type_id: Identifier,

		@Path('attachment_key')
		attachment_key: string

	): Promise<{}> {

		let result = await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.OOLAttachmentLinker 
            WHERE 
                AttachmentKey = '${attachment_key}'
                AND ObjectID = '${type_id}';
		`)

		// FIXME: currently cannot assign same key to diff. sub-object types!
        //AND ChildObjectType = '${to}'

		if (result.rowsAffected[0] === 0)
			throw new NotFound()
		return {}
	}
}
