import { SQL, Encrypt, Decrypt, Root } from '../app'
import ScriptRunner from '../utils/ScriptRunner'
import sql from 'mssql'
import { Participant } from '../model/Participant'
import { Study } from '../model/Study'
import { Researcher } from '../model/Researcher'
import { Activity } from '../model/Activity'
import { DynamicAttachment } from '../model/Type'
import { ResearcherRepository } from '../repository/ResearcherRepository'
import { ParticipantRepository } from '../repository/ParticipantRepository'
import { StudyRepository } from '../repository/StudyRepository'
import { ActivityRepository } from '../repository/ActivityRepository'

export function Identifier_pack(components: any[]): string {
	if (components.length === 0)
		return ''
	return Buffer.from(components.join(':')).toString('base64').replace(/=/g, '~')
}
export function Identifier_unpack(components: string): any[] {
	if (components.match(/^G?U\d+$/))
		return []
	return Buffer.from((<string>components).replace(/~/g, '='), 'base64').toString('utf8').split(':')
}

export class TypeRepository {

	public static async _parent(
		type_id: string
	): Promise<{}> {
		let result: any = {}
		for (let parent_type of TypeRepository._parent_type(type_id))
			result[parent_type] = await TypeRepository._parent_id(type_id, parent_type)
		return result 
	}

	/**
	 * Get the self type of a given ID.
	 */
	public static _self_type(type_id: string): string {
		let components = Identifier_unpack(type_id)
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
		return parent_types[TypeRepository._self_type(type_id)]
	}

	/**
	 * Get a single parent object ID for a given ID.
	 */
	public static async _parent_id(type_id: string, type: string): Promise<string> {
		const self_type: { [type: string]: Function } = {
			Researcher: ResearcherRepository,
			Study: StudyRepository,
			Participant: ParticipantRepository,
			Activity: ActivityRepository,
		}
		return await (<any>self_type[TypeRepository._self_type(type_id)])._parent_id(type_id, self_type[type])
	}

	/**
	 * 
	 */
	public static async _set(mode: 'a' | 'b', type: string, id: string, key: string, value?: DynamicAttachment | any) {
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
	public static async _get(mode: 'a' | 'b', id: string, key: string): Promise<DynamicAttachment[] | any | undefined> {
		
		let components = Identifier_unpack(id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await TypeRepository._parent(<string>id)
		if (Object.keys(parents).length === 0)
			parents = { ' ' : ' ' } // for the SQL 'IN' operator

		if (mode === 'a') {

			let result = (await SQL!.request().query(`
	            SELECT TOP 1 * 
	            FROM LAMP_Aux.dbo.OOLAttachment
	            WHERE [Key] = '${key}'
	                AND ((
	                	ObjectID = '${id}'
	                	AND ObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ObjectType IN ('${from_type}', '${id}')
	                ));
			`)).recordset

			if (result.length === 0)
				throw new Error('404.object-not-found')
			return JSON.parse(result[0].Value)
		} else if (mode === 'b') {

			let result = (await SQL!.request().query(`
	            SELECT TOP 1 * 
	            FROM LAMP_Aux.dbo.OOLAttachmentLinker
	            WHERE AttachmentKey = '${key}'
	            	AND ((
	                	ObjectID = '${id}'
	                	AND ChildObjectType = 'me'
	                ) OR (
	                	ObjectID IN (${Object.values(parents).map(x => `'${x}'`).join(', ')})
	                	AND ChildObjectType IN ('${from_type}', '${id}')
	                ));
			`)).recordset
			if (result.length === 0)
				throw new Error('404.object-not-found')

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

	public static async _list(mode: 'a' | 'b', id: string): Promise<string[]> {

		// Determine the parent type(s) of `type_id` first.
		let components = Identifier_unpack(id)
		let from_type: string = (components.length === 0) ? (<any>Participant).name : components[0]
		let parents = await TypeRepository._parent(<string>id)
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
			default: throw new Error('400.invalid-script-runner')
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
				ParticipantRepository._pack_id({ study_id: Decrypt(<string>x._SID) }) : 
				ResearcherRepository._pack_id({ admin_id: x.ID })), 
			_admin: (x.Type === 'Participant' ? 
				ResearcherRepository._pack_id({ admin_id: x._AID }) : 
				ResearcherRepository._pack_id({ admin_id: x.ID }))
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
		let result = await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.UpdateCounter;
		`)
		console.log('Resolved ' + JSON.stringify(result.recordset) + ' events.')

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
			.forEach(x => TypeRepository._invoke(x, {

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
					type: TypeRepository._self_type(x.to)
				},

				/* Currently meaningless but does signify what caused the IA to run. */
				event: ['ActivityEvent', 'SensorEvent']
			}).then((y) => {
				TypeRepository._set('a', x.to!, <string>x.from!, x.key! + '/output', y)
			}).catch((err) => {
				TypeRepository._set('a', x.to!, <string>x.from!, x.key! + '/output', JSON.stringify({ output: null, logs: err }))
			}))

		/* // TODO: This is for a single item only;
		let attachments: DynamicAttachment[] = await Promise.all((await TypeRepository._list('b', <string>type_id))
												.map(async x => (await TypeRepository._get('b', <string>type_id, x))))
		attachments
			.filter(x => !!x.triggers && x.triggers.length > 0)
			.forEach(x => TypeRepository._invoke(x).then(y => {
				TypeRepository._set('a', x.to!, <string>x.from!, x.key! + '/output')
			}))
		*/
	}
}

/**
 * Set up a 5-minute interval callback to invoke triggers.
 */
setInterval(() => { if (!!SQL) TypeRepository._process_triggers() }, (5 * 60 * 1000) /* 5min */)




// TODO: below is to convert legacy scheduling into modern cron-like versions
/* FIXME:
$obj->schedule = isset($raw->schedule) ? array_merge(...array_map(function($x) {
	$duration = new DurationInterval(); $ri = $x->repeat_interval;
	if ($ri >= 0 && $ri <= 4) { // hourly
		$h = ($ri == 4 ? 12 : ($ri == 3 ? 6 : ($ri == 2 ? 3 : 1)));
		$duration->interval = new CalendarComponents();
		$duration->interval->hour = $h;
	} else if ($ri >= 5 && $ri <= 10) { // weekly+
		if ($ri == 6) {
			$duration = [
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents()), 
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents())
			];
			$duration[0]->interval->weekday = 2;
			$duration[1]->interval->weekday = 4;
		} else if ($ri == 7) {
			$duration = [
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents()), 
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents()), 
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents())
			];
			$duration[0]->interval->weekday = 1;
			$duration[1]->interval->weekday = 3;
			$duration[2]->interval->weekday = 5;
		} else {
			$duration = [
				new DurationInterval(strtotime($x->time) * 1000, new CalendarComponents())
			];
			$duration[0]->interval->day = ($ri == 5 ? 1 : null);
			$duration[0]->interval->week_of_month = ($ri == 9 ? 2 : ($ri == 8 ? 1 : null));
			$duration[0]->interval->month = ($ri == 10 ? 1 : null);
		}
	} else if ($ri == 11 && count($x->custom_time) == 1) { // custom+
		$duration->start = strtotime($x->custom_time[0]) * 1000;
		$duration->repeat_count = 1;
	} else if ($ri == 11 && count($x->custom_time) > 2) { // custom*
		$int_comp = (new DateTime($x->custom_time[0]))
						->diff(new DateTime($x->custom_time[1]));
		$duration->start = strtotime($x->custom_time[0]) * 1000;
		$duration->interval = new CalendarComponents();
		$duration->interval->year = ($int_comp->y == 0 ? null : $int_comp->y);
		$duration->interval->month = ($int_comp->m == 0 ? null : $int_comp->m);
		$duration->interval->day = ($int_comp->d == 0 ? null : $int_comp->d);
		$duration->interval->hour = ($int_comp->h == 0 ? null : $int_comp->h);
		$duration->interval->minute = ($int_comp->i == 0 ? null : $int_comp->i);
		$duration->interval->second = ($int_comp->s == 0 ? null : $int_comp->s);
		$duration->repeat_count = count($x->custom_time) - 1;
	} else if ($ri == 12) { // none
		$duration->start = strtotime($x->time) * 1000;
		$duration->repeat_count = 1;
	}
	return is_array($duration) ? $duration : [$duration];
}, $raw->schedule)) : null;
*/

// Schedule:
//      - Admin_CTestSchedule, Admin_SurveySchedule
//          - AdminID, CTestID/SurveyID, Version*(C), ScheduleDate, SlotID, Time, RepeatID, IsDeleted
//      - Admin_CTestScheduleCustomTime, Admin_SurveyScheduleCustomTime, Admin_BatchScheduleCustomTime
//          - Time
//      - Admin_BatchSchedule
//          - AdminID, BatchName, ScheduleDate, SlotID, Time, RepeatID, IsDeleted
//      - Admin_BatchScheduleCTest, Admin_BatchScheduleSurvey
//          - CTestID/SurveyID, Version*(C), Order
//
// Settings:
//      - Admin_CTestSurveySettings
//          - AdminID, CTestID, SurveyID
//      - Admin_JewelsTrailsASettings, Admin_JewelsTrailsBSettings
//          - AdminID, ... (")
//      - SurveyQuestions
//          - SurveyID, QuestionText, AnswerType, IsDeleted
//      - SurveyQuestionsOptions
//          - QuestionID, OptionText





// https://en.wikipedia.org/wiki/Cron#CRON_expression
/*
* * * * * *
| | | | | | 
| | | | | +-- Year              (range: 1900-3000)
| | | | +---- Day of the Week   (range: 1-7; L=last, #=ordinal(range: 1-4))
| | | +------ Month of the Year (range: 1-12)
| | +-------- Day of the Month  (range: 1-31; L=last, W=nearest-weekday, #=ordinal(range: 1-52))
| +---------- Hour              (range: 0-23)
+------------ Minute            (range: 0-59)
*/


/*



enum RepeatTypeLegacy {
	hourly = 'hourly', // 0 * * * * *
	every3h = 'every3h', // 0 * /3 * * * *
	every6h = 'every6h', // 0 * /6 * * * *
	every12h = 'every12h', // 0 * /12 * * * *
	daily = 'daily', // 0 0 * * * *
	weekly = 'weekly', // 0 0 * * 0 *
	biweekly = 'biweekly', // 0 0 1,15 * * *
	monthly = 'monthly', // 0 0 1 * * *
	bimonthly = 'bimonthly', // 0 0 1 * /2 * *
	custom = 'custom', // 1 2 3 4 5 6
	none = 'none' // 0 0 0 0 0 0
}


*/