import { SQL, Encrypt, Decrypt, Root } from '../app'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth, Query,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { ScriptRunner } from '../utils'
import sql from 'mssql'

import { Participant } from './Participant'
import { Study } from './Study'
import { Researcher } from './Researcher'
import { Activity } from './Activity'

/* TODO: Researcher->Participant attachment overrides Participant->self? */
/* TODO: set_*_attachment: verify `target` is a valid id or 'me' AND if target not provided, delete all! */

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
		The API triggers that activate script execution. These will be event stream types
		or object types in the API, or, if scheduling execution periodically, a cron-job
		string prefixed with "!" (exclamation point). 
	`)
	public triggers?: string[]

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

	@Route.GET('/type/{type_id}/attachment') 
	@Description(d`
		
	`)
	@Auth(Ownership.Self | Ownership.Sibling | Ownership.Parent, 'type_id')
	@Throws(BadRequest, AuthorizationFailed, NotFound)
	public static async list_attachments(

		@Path('type_id')
		type_id: Identifier

	): Promise<string[]> {
		return (<string[]>[]).concat(
			(await Type._list('a', <string>type_id)), 
			(await Type._list('b', <string>type_id)).map(x => 'dynamic/' + x)
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
		return await Type._get('a', <string>type_id, attachment_key)
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
		if (Type._set('a', target, <string>type_id, attachment_key, attachment_value))
			return {}
		else throw new BadRequest()
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
		attachment_key: string,

		@Query('invoke_always')
		invoke_always?: boolean,

		@Query('include_logs')
		include_logs?: boolean,

		@Query('ignore_output')
		ignore_output?: boolean

	): Promise<any> {
		let result: any = {}
		if (!!invoke_always) {

			// If needed, invoke the attachment now.
			let attachment: DynamicAttachment = await Type._get('b', <string>type_id, attachment_key)
		    result = await Type._invoke(attachment, {})
			await Type._set('a', attachment.to!, <string>attachment.from, attachment.key + '/output', result)
		} else {

			// Otherwise, return any cached result available.
			result = await Type._get('a', <string>type_id, attachment_key + '/output')
		}
		return (!!include_logs && !ignore_output) ? result : {
			data: !ignore_output ? result.output : undefined,
			logs: !!include_logs ? result.logs : undefined
		}
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

		@Query('invoke_once')
		invoke_once?: boolean

	): Promise<{}> {
		if (Type._set('b', target, <string>type_id, attachment_key, attachment_value)) {

			// If needed, invoke the attachment now.
			if (!!invoke_once) {
			    Type._invoke(attachment_value, {}).then(y => {
					Type._set('a', target, <string>type_id, attachment_key + '/output', y)
				})
			}
			return {}
		}
		else throw new BadRequest()
	}

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
			Activity: ['Study', 'Researcher'],
		}
		/*
		// TODO:
		const shortcode_map = {
			'Researcher': 'R',
			'R': 'Researcher',
			'Study': 'S',
			'S': 'Study',
			'Participant': 'P',
			'P': 'Participant',
			'Activity': 'A',
			'A': 'Activity',
		}
		*/
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
			Activity: Activity,
		}
		return await (<any>self_type[Type._self_type(type_id)])._parent_id(type_id, self_type[type])
	}

	/**
	 * 
	 */
	private static async _set(mode: 'a' | 'b', type: string, id: string, key: string, value?: DynamicAttachment | any) {
		let result: sql.IResult<any>
		if (mode === 'a' && !value /* null | undefined */) /* DELETE */ {
			result = await SQL!.request().query(`
	            DELETE FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE 
	                ObjectID = '${id}'
	                AND [Key] = '${key}'
	                AND ObjectType = '${type}';
			`)
		} else if (mode === 'a' && !!value /* JSON value */) /* INSERT or UPDATE */ {
			let req = SQL!.request()
			req.input('json_value', sql.NVarChar, JSON.stringify(value))
			result = await req.query(`
	            MERGE INTO LAMP_Aux.dbo.OOLAttachment
	                WITH (HOLDLOCK) AS Output
	            USING (SELECT
	                '${type}' AS ObjectType,
	                '${id}' AS ObjectID,
	                '${key}' AS [Key]
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
	                    '${type}', '${id}', '${key}', @json_value
	                );
			`)
		} else if (mode === 'b' && !value /* null | undefined */) /* DELETE */ {
			result = await SQL!.request().query(`
	            DELETE FROM LAMP_Aux.dbo.OOLAttachmentLinker 
	            WHERE 
	                AttachmentKey = '${key}'
	                AND ObjectID = '${id}'
	                AND ChildObjectType = '${type}';
			`)
		} else if (mode === 'b' && !!value /* DynamicAttachment */) /* INSERT or UPDATE */ {
			let { triggers, language, contents, requirements } = value
			let script_type = JSON.stringify({ language, triggers })
			let packages = JSON.stringify(requirements) || ''

			let req = SQL!.request()
			req.input('script_contents', sql.NVarChar, contents)
			result = await req.query(`
	            MERGE INTO LAMP_Aux.dbo.OOLAttachmentLinker 
	                WITH (HOLDLOCK) AS Output
	            USING (SELECT
	                '${key}' AS AttachmentKey,
	                '${id}' AS ObjectID,
	                '${type}' AS ChildObjectType
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
	                    '${key}', '${id}', '${type}',
	                    '${script_type}', @script_contents, '${packages}'
	                );
			`)
		}
		return (result!.rowsAffected[0] !== 0)
	}

	/**
	 * TODO: if key is undefined just return every item instead as an array
	 */
	private static async _get(mode: 'a' | 'b', id: string, key: string): Promise<DynamicAttachment[] | any | undefined> {
		
		let components = Identifier.unpack(id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		if (mode === 'a') {

			let result = (await SQL!.request().query(`
	            SELECT TOP 1 * 
	            FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE [Key] = '${key}'
	                AND (
	                	ObjectID = '${id}'
	                	AND ObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ObjectType IN ('${from_type}', '${id}')
	                );
			`)).recordset

			if (result.length === 0)
				throw new NotFound()
			return JSON.parse(result[0].Value)
		} else if (mode === 'b') {

			let result = (await SQL!.request().query(`
	            SELECT TOP 1 * 
	            FROM LAMP_Aux.dbo.OOLAttachmentLinker
	            WHERE AttachmentKey = '${key}'
	            	AND (
	                	ObjectID = '${id}'
	                	AND ChildObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ChildObjectType IN ('${from_type}', '${id}')
	                );
			`)).recordset
			if (result.length === 0)
				throw new NotFound()

			// Convert all to DynamicAttachments.
			return result.map(x => {
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
			})[0]
		}
	}

	private static async _list(mode: 'a' | 'b', id: string): Promise<string[]> {

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier.unpack(id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await Type.parent(<string>id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		if (mode === 'a') {

			// Request all static attachments.
			return (await SQL!.request().query(`
	            SELECT [Key]
	            FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE (
	                	ObjectID = '${id}'
	                	AND ObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ObjectType IN ('${from_type}', '${id}')
	                );
			`)).recordset.map(x => x.Key)
		} else {

			// Request all dynamic attachments.
			return (await SQL!.request().query(`
	            SELECT AttachmentKey
	            FROM LAMP_Aux.dbo.OOLAttachmentLinker
	            WHERE (
	                	ObjectID = '${id}'
	                	AND ChildObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ChildObjectType IN ('${from_type}', '${id}')
	                );
			`)).recordset.map(x => x.AttachmentKey)
		}
	}

	/**
	 *
	 */
	public static async _invoke(attachment: DynamicAttachment, context: any): Promise<any | undefined> {
		if ((attachment.contents || '').trim().length === 0)
			return undefined

		// Select script runner for the right language...
		let runner: ScriptRunner
		switch (attachment.language) {
			case 'rscript': runner = new ScriptRunner.R(); break;
			case 'python': runner = new ScriptRunner.Py(); break;
			case 'javascript': runner = new ScriptRunner.JS(); break;
			case 'bash': runner = new ScriptRunner.Bash(); break;
			default: throw new Error()
		}

		// Execute script.
		return await runner.execute(attachment.contents!, attachment.requirements!.join(','), context)
	}

	/**
	 *
	 */
	public static async _process_triggers() {
		console.log('Processing accumulated attachment triggers...')

		// Request the set of all updates.
		let accumulated_set = (await SQL!.request().query(`
			SELECT 
				Type, ID, Subtype, 
				DATEDIFF_BIG(MS, '1970-01-01', LastUpdate) AS LastUpdate, 
				Users.StudyId AS _SID,
				Users.AdminID AS _AID
			FROM LAMP_Aux.dbo.UpdateCounter
			LEFT JOIN LAMP.dbo.Users
				ON Type = 'Participant' AND Users.UserID = ID
			ORDER BY LastUpdate DESC;
		`)).recordset.map(x => ({
			...x, 
			_id: (x.Type === 'Participant' ? 
				Participant._pack_id({ study_id: Decrypt(<string>x._SID) }) : 
				Researcher._pack_id({ admin_id: x.ID })), 
			_admin: (x.Type === 'Participant' ? 
				Researcher._pack_id({ admin_id: x._AID }) : 
				Researcher._pack_id({ admin_id: x.ID }))
		}))
		let ax_set1 = accumulated_set.map(x => x._id)
		let ax_set2 = accumulated_set.map(x => x._admin)

		// Request the set of event masks prepared.
		let registered_set = (await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.OOLAttachmentLinker; 
		`)).recordset // TODO: SELECT * FROM LAMP_Aux.dbo.OOLTriggerSet;

		// Diff the masks against all updates.
		let working_set = registered_set.filter(x => (

			/* Attachment from self -> self. */
			(x.ChildObjectType === 'me' && ax_set1.indexOf(x.ObjectID) >= 0) ||

			/* Attachment from self -> children of type Participant */
			(x.ChildObjectType === 'Participant' && ax_set2.indexOf(x.ObjectID) >= 0) ||

			/* Attachment from self -> specific child Participant matching an ID */
			(accumulated_set.find(y => (y._id === x.ChildObjectType && y._admin === x.ObjectID)) !== undefined) 
		))

		// Completely delete all updates; we're done collecting the working set.
		// TODO: Maybe don't delete before execution?
		//console.dir(working_set.map(x => x.AttachmentLinkerID))
		/*let result = await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.UpdateCounter;
		`)*/

		// Duplicate the working set into specific entries.
		working_set = working_set
			.map(x => {
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
			}).map(x => {

				// Apply a subgroup transformation only if we're targetting all 
				// child resources of a type (i.e. 'Participant').
				if (x.to === 'Participant')
					return accumulated_set
							.filter(y => 
								y.Type === 'Participant' && 
								y._admin === x.from && 
								y._id !== y._admin)
							.map(y => ({ ...x, to: y._id }))
				return [{ ...x, to: <string>x.from }]
			});

		(<any[]>[]).concat(...working_set)
			.forEach(x => Type._invoke(x, {

				/* The security context originator for the script 
				   with a magic placeholder to indicate to the LAMP server
				   that the script's API requests are pre-authenticated. */
				token: 'LAMP' + Encrypt(JSON.stringify({
					identity: { from: x.from, to: x.to },
					cosigner: Root
				})),

				/* What object was this automation run for on behalf of an agent? */
				object: {
					id: x.to,
					type: Type._self_type(x.to)
				},

				/* Currently meaningless but does signify what caused the IA to run. */
				event: ['ResultEvent', 'SensorEvent']
			}).then((y) => {
				Type._set('a', x.to!, <string>x.from!, x.key! + '/output', y)
			}).catch((err) => {
				Type._set('a', x.to!, <string>x.from!, x.key! + '/logs', JSON.stringify(err))
			}))

		/* // TODO: This is for a single item only;
		let attachments: DynamicAttachment[] = await Promise.all((await Type._list('b', <string>type_id))
												.map(async x => (await Type._get('b', <string>type_id, x))))
		attachments
			.filter(x => !!x.triggers && x.triggers.length > 0)
			.forEach(x => Type._invoke(x).then(y => {
				Type._set('a', x.to!, <string>x.from!, x.key! + '/output')
			}))
		*/
	}
}

/**
 * Set up a 5-minute interval callback to invoke triggers.
 */
setInterval(() => { if (!!SQL) Type._process_triggers() }, (5 * 60 * 1000) /* 5min */)
