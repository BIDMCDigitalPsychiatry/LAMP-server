import sql from 'mssql'
import crypto from 'crypto'
import { IResult } from 'mssql'

let SQL: sql.ConnectionPool | undefined;


/*
ALTER DATABASE LAMP SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
sp_MSforeachtable @command1 = "ALTER TABLE ? ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON)";
*/


/*
ALTER DATABASE LAMP SET CHANGE_TRACKING = OFF;
sp_MSforeachtable @command1 = "ALTER TABLE ? DISABLE CHANGE_TRACKING";
*/


/*
sp_MSforeachtable @command1 = "SELECT * FROM CHANGETABLE(CHANGES ?, 0) AS C";
*/


/*
WITH CHANGE_TRACKING_CONTEXT(0xC0DED00D)
UPDATE LAMP.dbo.Admin
SET EditedOn = NULL
WHERE AdminID = 99;
*/


export const Setup = async (key: string) => {
	SQL = await new sql.ConnectionPool({
		user: process.env.DB_USERNAME || '',
		password: process.env.DB_PASSWORD || '',
		server: process.env.DB_SERVER || '',
		port: parseInt(process.env.DB_PORT || '') || 1433,
		database: process.env.DB_NAME || 'LAMP',
	    parseJSON: true,
	    options: { 
	    	encrypt: true, 
	    	appName: 'LAMP-server',
	    	abortTransactionOnError: true 
	    },
	    pool: {
	        min: 0, 
	        max: 10,
	        idleTimeoutMillis: 30000
	    }
	}).connect()
}

export const Changes = async () => {
	return '' + parseInt((await SQL!.request().query(`SELECT CHANGE_TRACKING_CURRENT_VERSION();`)).recordset[0][''])
}

export const Encrypt = (data: string, mode: 'Rijndael' | 'AES256' = 'Rijndael'): string | undefined => {
	try {
		if (mode === 'Rijndael') {
			let cipher = crypto.createCipheriv('aes-256-ecb', process.env.DB_KEY || '', '')
			return cipher.update(data, 'utf8', 'base64') + cipher.final('base64')
		} else if (mode === 'AES256') {
			let ivl = crypto.randomBytes(16)
			let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ROOT_KEY || '', 'hex'), ivl)
			return Buffer.concat([
				ivl,
				cipher.update(Buffer.from(data, 'utf16le')), 
				cipher.final()
			]).toString('base64')
		}
	} catch {}
	return undefined
}

export const Decrypt = (data: string, mode: 'Rijndael' | 'AES256' = 'Rijndael'): string | undefined => {
	try {
		if (mode === 'Rijndael') {
			let cipher = crypto.createDecipheriv('aes-256-ecb', process.env.DB_KEY || '', '')
			return cipher.update(data, 'base64', 'utf8') + cipher.final('utf8')
		} else if (mode === 'AES256') {
			let dat = Buffer.from(data, 'base64')
			let cipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ROOT_KEY || '', 'hex'), dat.slice(0, 16))
			return Buffer.concat([
				cipher.update(dat.slice(16)),
				cipher.final()
			]).toString('utf16le')
		}
	} catch {}
	return undefined
}

class Identifier {
	public static pack(components: any[]): string {
		if (components.length === 0)
			return ''
		return Buffer.from(components.join(':')).toString('base64').replace(/=/g, '~')
	}
	public static unpack(components: string): any[] {
		if (components.match(/^G?U\d+$/))
			return []
		return Buffer.from((<string>components).replace(/~/g, '='), 'base64').toString('utf8').split(':')
	}
	public static researcher_pack(components: { admin_id?: number }): string {
		return Identifier.pack([
			(<any>Researcher).name, 
			components.admin_id || 0,
		])
	}
	public static researcher_unpack(id: string): ({ admin_id: number }) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>Researcher).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			admin_id: !isNaN(result[0]) ? result[0] : 0
		}
	}
	public static study_pack(components: { admin_id?: number }): string {
		return Identifier.pack([
			(<any>Study).name, 
			components.admin_id || 0,
		])
	}
	public static study_unpack(id: string): ({ admin_id: number }) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>Study).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			admin_id: !isNaN(result[0]) ? result[0] : 0
		}
	}
	public static participant_pack(components: {study_id?: string}): string {
		return components.study_id || ''
	}
	public static participant_unpack(id: string): ({study_id: string}) {
		return { study_id: <string>id }
	}
	public static activity_pack(components: { activity_spec_id?: number; admin_id?: number; survey_id?: number; }): string {
		return Identifier.pack([
			(<any>Activity).name, 
			components.activity_spec_id || 0, 
			components.admin_id || 0, 
			components.survey_id || 0
		])
	}
	public static activity_unpack(id: string): ({ activity_spec_id: number; admin_id: number; survey_id: number }) {
		let components = Identifier.unpack(id)
		if (components[0] !== (<any>Activity).name)
			throw new Error('invalid identifier')
		let result = components.slice(1).map(x => parseInt(x))
		return {
			activity_spec_id: !isNaN(result[0]) ? result[0] : 0,
			admin_id: !isNaN(result[1]) ? result[1] : 0,
			survey_id: !isNaN(result[2]) ? result[2] : 0,
		}
	}
}

export class Researcher {
	public static async _select(change_version?: string): Promise<any[]> {
		let admin_id: number | undefined
		/*
		let id = undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if(!!id) throw new Error()
		*/
		
		return (await SQL!.request().query(`
			SELECT 
                AdminID AS id, 
                isDeleted AS deleted,
                FirstName AS name, 
                LastName AS lname
            FROM Admin
            WHERE 1=1
            	${!!admin_id ? `AND AdminID = '${admin_id}'` : ''}
            	${!!change_version ?
        		`AND AdminID IN (
            		SELECT AdminID 
            		FROM CHANGETABLE(CHANGES Admin, ${change_version}) AS C 
            		WHERE SYS_CHANGE_CONTEXT IS NULL
            	)` : ''}
		;`)).recordset.map((raw: any) => {
			let obj = {} as any
			obj._id = Identifier.researcher_pack({ admin_id: raw.id })
			obj._deleted = raw.deleted
			obj.$_sync_id = raw.id
			obj.$_parent_id = null
			obj.name = [Decrypt(raw.name), Decrypt(raw.lname)].join(' ')
			return obj
		})
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		return (await SQL!.request().query(`
			WITH CHANGE_TRACKING_CONTEXT(0xC0DED00D)
			MERGE INTO LAMP.dbo.Admin
				WITH (HOLDLOCK) AS Target
			USING (VALUES ${documents.map(x => `(
				${!!x._id ? `'${x._id}'` : 'NULL'},
				${!!x.$_sync_id ? x.$_sync_id : 'NULL'},
				${typeof x._deleted === 'boolean' ? (x._deleted === true ? '1' : '0') : 'NULL'},
				${!!x.name ? `'${Encrypt(x.name.split(' ')[0] || '')}'` : 'NULL'},
				${!!x.name ? `'${Encrypt(x.name.split(' ')[1] || '')}'` : 'NULL'}
			)`).join(',')}) AS Source(
				OriginalID,
				AdminID,
				IsDeleted,
				FirstName,
				LastName
			)
			ON Target.AdminID = Source.AdminID
			WHEN MATCHED THEN 
				UPDATE SET 
					Target.IsDeleted = CASE 
						WHEN Source.IsDeleted IS NULL 
						THEN Target.IsDeleted 
						ELSE Source.IsDeleted
					END, 
	                Target.FirstName = CASE 
	                	WHEN Source.FirstName IS NULL 
	                	THEN Target.FirstName 
	                	ELSE Source.FirstName 
                	END, 
	                Target.LastName = CASE 
	                	WHEN Source.LastName IS NULL 
	                	THEN Target.LastName 
	                	ELSE Source.LastName 
                	END
			WHEN NOT MATCHED THEN 
				INSERT (
					Email, 
	                FirstName, 
	                LastName, 
	                CreatedOn, 
	                AdminType
                ) VALUES (
					'', 
	                CASE 
	                	WHEN Source.FirstName IS NULL 
	                	THEN '' 
	                	ELSE Source.FirstName 
                	END, 
	                CASE 
	                	WHEN Source.LastName IS NULL 
	                	THEN '' 
	                	ELSE Source.LastName 
                	END, 
					GETDATE(), 
					2
                )
			OUTPUT 
				$action AS Action, 
				Source.OriginalID AS SourceID,
				INSERTED.AdminID AS TargetID
		;`)).recordset
	}
}

export class Study {
	public static async _select(change_version?: string): Promise<any[]> {
		let admin_id: number | undefined
		/*
		let id = undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if(!!id) throw new Error()
		*/
		
		return (await SQL!.request().query(`
			SELECT 
                AdminID AS id, 
                isDeleted AS deleted,
                FirstName AS name, 
                LastName AS lname
            FROM Admin
            WHERE 1=1
            	${!!admin_id ? `AND AdminID = '${admin_id}'` : ''}
            	${!!change_version ? 
        		`AND AdminID IN (
        			SELECT AdminID 
        			FROM CHANGETABLE(CHANGES Admin, ${change_version}) AS C 
        			WHERE SYS_CHANGE_CONTEXT IS NULL
    			)` : ''}
		;`)).recordset.map((raw: any) => {
			let obj = {} as any
			obj._id = Identifier.study_pack({ admin_id: raw.id })
			obj._deleted = raw.deleted
			obj.$_sync_id = raw.id
			obj.$_parent_id = Identifier.researcher_pack({ admin_id: raw.id })
			obj.name = [Decrypt(raw.name), Decrypt(raw.lname)].join(' ')
			return obj
		})
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		return (await SQL!.request().query(`
			WITH CHANGE_TRACKING_CONTEXT(0xC0DED00D)
			MERGE INTO LAMP.dbo.Admin
				WITH (HOLDLOCK) AS Target
			USING (VALUES ${documents.map(x => `(
				${!!x._id ? `'${x._id}'` : 'NULL'},
				${!!x.$_sync_id ? x.$_sync_id : 'NULL'},
				${typeof x._deleted === 'boolean' ? (x._deleted === true ? '1' : '0') : 'NULL'},
				${!!x.name ? `'${Encrypt(x.name.split(' ')[0] || '')}'` : 'NULL'},
				${!!x.name ? `'${Encrypt(x.name.split(' ')[1] || '')}'` : 'NULL'}
			)`).join(',')}) AS Source(
				OriginalID,
				AdminID,
				IsDeleted,
				FirstName,
				LastName
			)
			ON Target.AdminID = Source.AdminID
			WHEN MATCHED THEN 
				UPDATE SET 
					Target.IsDeleted = CASE 
						WHEN Source.IsDeleted IS NULL 
						THEN Target.IsDeleted 
						ELSE Source.IsDeleted
					END, 
	                Target.FirstName = CASE 
	                	WHEN Source.FirstName IS NULL 
	                	THEN Target.FirstName 
	                	ELSE Source.FirstName 
                	END, 
	                Target.LastName = CASE 
	                	WHEN Source.LastName IS NULL 
	                	THEN Target.LastName 
	                	ELSE Source.LastName 
                	END
			WHEN NOT MATCHED THEN 
				INSERT (
					Email, 
	                FirstName, 
	                LastName, 
	                CreatedOn, 
	                AdminType
                ) VALUES (
					'', 
	                CASE 
	                	WHEN Source.FirstName IS NULL 
	                	THEN '' 
	                	ELSE Source.FirstName 
                	END, 
	                CASE 
	                	WHEN Source.LastName IS NULL 
	                	THEN '' 
	                	ELSE Source.LastName 
                	END, 
					GETDATE(), 
					2
                )
			OUTPUT 
				$action AS Action, 
				Source.OriginalID AS SourceID,
				INSERTED.AdminID AS TargetID
		;`)).recordset
	}
}

export class Participant {
	public static async _select(change_version?: string): Promise<any[]> {
		let user_id: string | undefined
		let admin_id: number | undefined
		/*
		let id = undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if (!!id && Identifier.unpack(id).length === 0) // 0 = Participant
			user_id = Identifier.participant_unpack(id).study_id
		else if(!!id) throw new Error()
		*/

	    return (await SQL!.request().query(`
            SELECT 
            	Users.UserID AS [_id],
            	Users.AdminID AS [_parent],
                StudyId AS id, 
                StudyCode AS study_code, 
                AppColor AS [theme], 
                Language AS [language], 
                [24By7ContactNo] AS [emergency_contact],
                PersonalHelpline AS [helpline],
                Users.IsDeleted AS deleted
            FROM Users
            FULL OUTER JOIN UserSettings
                ON UserSettings.UserID = Users.UserID
            FULL OUTER JOIN UserDevices
                ON UserDevices.UserID = Users.UserID
            WHERE 1=1
            	${!!user_id ? `AND Users.StudyId = '${Encrypt(user_id)}'` : ''} 
            	${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ''}
            	${!!change_version ? 
        		`AND Users.UserID IN (
        			SELECT UserID 
        			FROM CHANGETABLE(CHANGES Users, ${change_version}) AS C 
        			WHERE SYS_CHANGE_CONTEXT IS NULL
    			)` : ''}
	    ;`)).recordset.map((raw: any) => {
        	let obj = {} as any
        	obj._id = Decrypt(raw.id)
        	obj._deleted = raw.deleted
            obj.$_sync_id = raw._id
			obj.$_parent_id = Identifier.study_pack({ admin_id: raw._parent })
        	return obj
        })
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		let result = await SQL!.request().query(`
			WITH CHANGE_TRACKING_CONTEXT(0xC0DED00D)
			MERGE INTO LAMP.dbo.Users
				WITH (HOLDLOCK) AS Target
			USING (VALUES ${documents.map(x => `(
				'${x._id}',
				'${Encrypt(x._id)}',
				'${Encrypt(x._id + '@lamp.com')}',
				${x.$_sync_id || 'NULL'},
				${x.$_parent_id || 'NULL'},
				${!!x._deleted ? '1' : '0'}
			)`).join(',')}) AS Source(
				OriginalID,
				StudyId,
				Email,
				UserID,
				AdminID,
				IsDeleted
			)
			ON Target.UserID = Source.UserID
			WHEN MATCHED THEN 
				UPDATE SET 
					Target.StudyId = Source.StudyId, 
					Target.Email = Source.Email,
					Target.AdminID = Source.AdminID, 
					Target.IsDeleted = Source.IsDeleted
			WHEN NOT MATCHED THEN 
				INSERT (
	                Email, 
	                Password,
	                StudyCode, 
	                StudyId, 
	                CreatedOn, 
	                Status,
	                AdminID
                ) VALUES (
					Email, 
	                '', 
	                '${Encrypt('001')}', 
					StudyId, 
			        GETDATE(), 
			        0,
			        AdminID
                )
			OUTPUT 
				$action AS Action, 
				Source.OriginalID AS SourceID,
				INSERTED.UserID AS TargetID
		;`)

		let created = result.recordset.filter(x => x.Action === 'INSERT')
		if (created.length === 0)
			return result.recordset
		try {
			await SQL!.request().query(`
				WITH CHANGE_TRACKING_CONTEXT(0xC0DED00D)
	            INSERT INTO UserSettings (
	                UserID, 
	                AppColor,
	                SympSurvey_SlotID,
	                SympSurvey_RepeatID,
	                CognTest_SlotID,
	                CognTest_RepeatID,
	                [24By7ContactNo], 
	                PersonalHelpline,
	                PrefferedSurveys,
	                PrefferedCognitions,
	                Language
	            )
				VALUES ${created.map(x => `(
				    ${x.TargetID},
			        '${Encrypt('#359FFE')}',
			        1,
			        1,
			        1,
			        1,
			        '',
			        '',
			        '',
			        '',
			        'en'
				)`).join(',')}
			;`);
		} catch(err) { console.log(err) }
		return result.recordset
	}
}

export class Activity {
	public static async _select(change_version?: string): Promise<any[]> {
		let ctest_id: number | undefined
		let survey_id: number | undefined
		let admin_id: number | undefined
		/*
		let id: string | undefined = undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if (!!id && Identifier.unpack(id)[0] === (<any>Activity).name) {
			let c = Identifier.activity_unpack(id)
			ctest_id = c.activity_spec_id
			survey_id = c.survey_id
			admin_id = c.admin_id
		} else if(!!id) throw new Error()
		*/

		const spec_map: { [string: string]: any; } = {
			'lamp.survey': 'Survey',
			'lamp.nback': 'N-Back',
			'lamp.trails_b': 'Trails B',
			'lamp.spatial_span': 'Spatial Span',
			'lamp.simple_memory': 'Simple Memory',
			'lamp.serial7s': 'Serial 7s',
			'lamp.cats_and_dogs': 'Cats and Dogs',
			'lamp.3d_figure_copy': '3D Figure Copy',
			'lamp.visual_association': 'Visual Association',
			'lamp.digit_span': 'Digit Span',
			'lamp.cats_and_dogs_new': 'Cats and Dogs New',
			'lamp.temporal_order': 'Temporal Order',
			'lamp.nback_new': 'N-Back New',
			'lamp.trails_b_new': 'Trails B New',
			'lamp.trails_b_dot_touch': 'Trails B Dot Touch',
			'lamp.jewels_a': 'Jewels Trails A',
			'lamp.jewels_b': 'Jewels Trails B',
			'lamp.scratch_image': 'Scratch Image',
			'lamp.spin_wheel': 'Spin Wheel',
		}

		let ctest = await SQL!.request().query(`
			SELECT 
				AdminID AS aid,
				Admin.IsDeleted AS deleted,
				('ctest') AS type,
				CTest.*,
				(
					SELECT 
						NoOfSeconds_Beg AS beginner_seconds,
						NoOfSeconds_Int AS intermediate_seconds,
						NoOfSeconds_Adv AS advanced_seconds,
						NoOfSeconds_Exp AS expert_seconds,
						NoOfDiamonds AS diamond_count,
						NoOfShapes AS shape_count,
						NoOfBonusPoints AS bonus_point_count,
						X_NoOfChangesInLevel AS x_changes_in_level_count,
						X_NoOfDiamonds AS x_diamond_count,
						Y_NoOfChangesInLevel AS y_changes_in_level_count,
						Y_NoOfShapes AS y_shape_count
					FROM Admin_JewelsTrailsASettings
					WHERE Admin_JewelsTrailsASettings.AdminID = Admin.AdminID
						AND CTest.lid = 17
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsA],
				(
					SELECT
						NoOfSeconds_Beg AS beginner_seconds,
						NoOfSeconds_Int AS intermediate_seconds,
						NoOfSeconds_Adv AS advanced_seconds,
						NoOfSeconds_Exp AS expert_seconds,
						NoOfDiamonds AS diamond_count,
						NoOfShapes AS shape_count,
						NoOfBonusPoints AS bonus_point_count,
						X_NoOfChangesInLevel AS x_changes_in_level_count,
						X_NoOfDiamonds AS x_diamond_count,
						Y_NoOfChangesInLevel AS y_changes_in_level_count,
						Y_NoOfShapes AS y_shape_count
					FROM Admin_JewelsTrailsBSettings
					WHERE Admin_JewelsTrailsBSettings.AdminID = Admin.AdminID
						AND CTest.lid = 18
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsB],
				(
					SELECT
						Version as version,
						ScheduleDate as schedule_date,
						Time as time,
						RepeatID as repeat_interval,
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								Time AS t
							FROM Admin_CTestScheduleCustomTime
							WHERE Admin_CTestScheduleCustomTime.AdminCTestSchId = Admin_CTestSchedule.AdminCTestSchId
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 't')) AS custom_time
					FROM Admin_CTestSchedule
					WHERE Admin_CTestSchedule.AdminID = Admin.AdminID
						AND Admin_CTestSchedule.CTestID = CTest.lid
						AND Admin_CTestSchedule.IsDeleted = 0
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS schedule
			FROM Admin
			CROSS APPLY 
			(
				SELECT 
					ActivityIndexID AS id,
					LegacyCTestID AS lid,
					Name AS name
				FROM LAMP_Aux.dbo.ActivityIndex
				WHERE LegacyCTestID IS NOT NULL
			) AS CTest
			WHERE 1=1
				${!ctest_id ? '' : `AND CTest.id = '${ctest_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
				${!!change_version ? 'AND 1=0' : ''}
			FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
		;`)


		let result = await SQL!.request().query(`
		WITH A(value) AS (
			SELECT 
				AdminID AS aid,
				Admin.IsDeleted AS deleted,
				('ctest') AS type,
				CTest.*,
				(
					SELECT 
						NoOfSeconds_Beg AS beginner_seconds,
						NoOfSeconds_Int AS intermediate_seconds,
						NoOfSeconds_Adv AS advanced_seconds,
						NoOfSeconds_Exp AS expert_seconds,
						NoOfDiamonds AS diamond_count,
						NoOfShapes AS shape_count,
						NoOfBonusPoints AS bonus_point_count,
						X_NoOfChangesInLevel AS x_changes_in_level_count,
						X_NoOfDiamonds AS x_diamond_count,
						Y_NoOfChangesInLevel AS y_changes_in_level_count,
						Y_NoOfShapes AS y_shape_count
					FROM Admin_JewelsTrailsASettings
					WHERE Admin_JewelsTrailsASettings.AdminID = Admin.AdminID
						AND CTest.lid = 17
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsA],
				(
					SELECT
						NoOfSeconds_Beg AS beginner_seconds,
						NoOfSeconds_Int AS intermediate_seconds,
						NoOfSeconds_Adv AS advanced_seconds,
						NoOfSeconds_Exp AS expert_seconds,
						NoOfDiamonds AS diamond_count,
						NoOfShapes AS shape_count,
						NoOfBonusPoints AS bonus_point_count,
						X_NoOfChangesInLevel AS x_changes_in_level_count,
						X_NoOfDiamonds AS x_diamond_count,
						Y_NoOfChangesInLevel AS y_changes_in_level_count,
						Y_NoOfShapes AS y_shape_count
					FROM Admin_JewelsTrailsBSettings
					WHERE Admin_JewelsTrailsBSettings.AdminID = Admin.AdminID
						AND CTest.lid = 18
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS [settings.jewelsB],
				(
					SELECT
						Version as version,
						ScheduleDate as schedule_date,
						Time as time,
						RepeatID as repeat_interval,
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								Time AS t
							FROM Admin_CTestScheduleCustomTime
							WHERE Admin_CTestScheduleCustomTime.AdminCTestSchId = Admin_CTestSchedule.AdminCTestSchId
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 't')) AS custom_time
					FROM Admin_CTestSchedule
					WHERE Admin_CTestSchedule.AdminID = Admin.AdminID
						AND Admin_CTestSchedule.CTestID = CTest.lid
						AND Admin_CTestSchedule.IsDeleted = 0
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS schedule
			FROM Admin
			CROSS APPLY 
			(
				SELECT 
					ActivityIndexID AS id,
					LegacyCTestID AS lid,
					Name AS name
				FROM LAMP_Aux.dbo.ActivityIndex
				WHERE LegacyCTestID IS NOT NULL
			) AS CTest
			WHERE 1=1
				${!ctest_id ? '' : `AND CTest.id = '${ctest_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
				${!!change_version ? 'AND 1=0' : ''}
			FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
		), B(value) AS (
			SELECT 
				SurveyID AS id, 
				AdminID AS aid,
				Survey.isDeleted AS deleted,
				SurveyName AS name, 
				('survey') AS type,
				(
					SELECT 
						QuestionText AS text, 
						CHOOSE(AnswerType, 
							'likert', 'list', 'boolean', 'clock', 'years', 'months', 'days'
						) AS type, 
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								OptionText AS opt
							FROM SurveyQuestionOptions
							WHERE SurveyQuestionOptions.QuestionID = SurveyQuestions.QuestionID
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 'opt')) AS options
						FROM SurveyQuestions
						WHERE IsDeleted = 0 
							AND SurveyQuestions.SurveyID = Survey.SurveyID
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS questions,
				(
					SELECT
						ScheduleDate as schedule_date,
						Time as time,
						RepeatID as repeat_interval,
						JSON_QUERY(dbo.UNWRAP_JSON((
							SELECT 
								Time AS t
							FROM Admin_SurveyScheduleCustomTime
							WHERE Admin_SurveyScheduleCustomTime.AdminSurveySchId = Admin_SurveySchedule.AdminSurveySchId
							FOR JSON PATH, INCLUDE_NULL_VALUES
						), 't')) AS custom_time
					FROM Admin_SurveySchedule
					WHERE Admin_SurveySchedule.SurveyID = Survey.SurveyID
						AND Admin_SurveySchedule.IsDeleted = 0
					FOR JSON PATH, INCLUDE_NULL_VALUES
				) AS schedule
			FROM Survey
			WHERE 1=1
				${!ctest_id ? '' : (ctest_id === 1 /* survey */ ? '' : `AND 1=0`)}
				${!survey_id ? '' : `AND SurveyID = '${survey_id}'`}
				${!admin_id ? '' : `AND AdminID = '${admin_id}'`}
				${!!change_version ? 'AND 1=0' : ''}
			FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
		)
		SELECT CONCAT('[', A.value, CASE 
			WHEN LEN(A.value) > 0 AND LEN(B.value) > 0 THEN ',' ELSE '' 
		END, B.value, ']')
		FROM A, B
		;`)
		return JSON.parse(result.recordset[0]['']).map((raw: any) => {
			let obj = {} as any
			if (raw.type === 'ctest') {
				obj._id = Identifier.activity_pack({
					activity_spec_id: raw.id,
					admin_id: raw.aid
				})
				obj._deleted = raw.deleted
				obj.$_sync_id = [raw.id, raw.aid, null]
				obj.$_parent_id = Identifier.study_pack({ admin_id: raw.aid })
				obj.spec = raw.name
				obj.name = spec_map[(<string>raw.name)]
				obj.settings = {
					...(raw.settings.jewelsA || ({'0': {}}))['0'],
					...(raw.settings.jewelsB || ({'0': {}}))['0']
				}
			} else if (raw.type === 'survey') {
				obj._id = Identifier.activity_pack({
					activity_spec_id: 1 /* survey */,
					admin_id: raw.aid,
					survey_id: raw.id
				})
				obj._deleted = raw.deleted
				obj.$_sync_id = [1, raw.aid, raw.id]
				obj.$_parent_id = Identifier.study_pack({ admin_id: raw.aid })
				obj.spec = 'lamp.survey'
				obj.name = raw.name
				obj.settings = raw.questions
			}
			return obj
		})
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		documents = documents.filter(x => x.spec === 'lamp.survey')

		// TODO... use schedule + settings for survey config!
 		// TODO: ActivitySpec::_jewelsMap('key', null)
		// ... use name for rename activity only
		// ... use schedule + settings for survey config!
		// UPDATE Survey SET IsDeleted = 1 WHERE SurveyID = ${id.survey_id};

		throw new Error()
	}
}

export class ActivityEvent {
	public static async _select(change_version?: string): Promise<any[]> {
		let id: string | undefined = undefined
		let activity_id_or_spec: string | undefined = undefined
		let from_date: number | undefined = undefined
		let to_date: number | undefined = undefined

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if (!!id && Identifier.unpack(id).length === 0 /* Participant */)
			user_id = Identifier.participant_unpack(id).study_id
		else if(!!id) throw new Error()

		user_id = !!user_id ? Encrypt(user_id) : user_id
		let conds = [
			!!user_id ? `Users.StudyId = '${user_id}'` : null,
			!!admin_id ? `Users.AdminID = '${admin_id}'` : null,
			!!from_date ? `DATEDIFF_BIG(MS, '1970-01-01', timestamp) >= ${from_date}` : null,
			!!to_date ? `DATEDIFF_BIG(MS, '1970-01-01', timestamp) <= ${to_date}` : null,
		].filter(x => !!x)
		let str = (conds.length > 0 ? ('WHERE ' + conds.join(' AND ')) : '')

		// Collect the set of legacy Activity tables and stitch the full query.
		let result = (await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
		`)).recordset.map(async (entry: any) => {

			// Perform the result lookup for every Activity table.
			let events = (await SQL!.request().query(`
				SELECT
					Users.StudyId AS uid,
	                [${entry.IndexColumnName}] AS id,
	                DATEDIFF_BIG(MS, '1970-01-01', [${entry.StartTimeColumnName}]) AS timestamp,
	                DATEDIFF_BIG(MS, [${entry.StartTimeColumnName}], [${entry.EndTimeColumnName}]) AS duration,
	                ${!entry.Slot1Name ?  '' :
	                    `[${entry.Slot1ColumnName}] AS [static_data.${entry.Slot1Name}],`}
	                ${!entry.Slot2Name ? '' :
	                    `[${entry.Slot2ColumnName}] AS [static_data.${entry.Slot2Name}],`}
	                ${!entry.Slot3Name ? '': 
	                    `[${entry.Slot3ColumnName}] AS [static_data.${entry.Slot3Name}],`}
	                ${!entry.Slot4Name ? '' :
	                    `[${entry.Slot4ColumnName}] AS [static_data.${entry.Slot4Name}],`}
	                ${!entry.Slot5Name ? '' : 
	                    `[${entry.Slot5ColumnName}] AS [static_data.${entry.Slot5Name}],`}
	                Users.AdminID AS aid
	            FROM [${entry.TableName}]
	            LEFT JOIN Users
	                ON [${entry.TableName}].UserID = Users.UserID
	            ${str.replace(/timestamp/g, `[${entry.StartTimeColumnName}]`)}
	            ${!!change_version ? 
            	`${conds.length === 0 ? 'WHERE' : 'AND'} [${entry.IndexColumnName}] IN (
            		SELECT C.[${entry.IndexColumnName}] 
            		FROM CHANGETABLE(CHANGES [${entry.TableName}], ${change_version}) AS C 
            		WHERE SYS_CHANGE_OPERATION = 'I' 
            			AND SYS_CHANGE_CONTEXT IS NULL
    			)` : ''}
			;`)).recordset

			if (events.length === 0)
				return []

			// If temporal events are recorded by the activity, look all of them up as well.
			let slices: any[] = []
			if (!!entry.TemporalTableName) {
				slices = (await SQL!.request().query(`
	                SELECT
	                    [${entry.TemporalTableName}].[${entry.IndexColumnName}] AS parent_id,
	                    ${!!entry.Temporal1ColumnName ? 
	                        `[${entry.TemporalTableName}].[${entry.Temporal1ColumnName}]` :
	                        '(NULL)'} AS item,
	                    ${!!entry.Temporal2ColumnName ?
	                        `[${entry.TemporalTableName}].[${entry.Temporal2ColumnName}]` :
	                        '(NULL)'} AS value,
	                    ${!!entry.Temporal3ColumnName ?
	                        `[${entry.TemporalTableName}].[${entry.Temporal3ColumnName}]` :
	                        '(NULL)'} AS type,
	                    ${!!entry.Temporal4ColumnName ?
	                        `CAST(CAST([${entry.TemporalTableName}].[${entry.Temporal4ColumnName}] AS float) * 1000 AS bigint)` :
	                        '(NULL)'} AS duration,
	                    ${!!entry.Temporal5ColumnName ?
	                        `[${entry.TemporalTableName}].[${entry.Temporal5ColumnName}]` :
	                        '(NULL)'} AS level
	                FROM [${entry.TemporalTableName}]
	                LEFT JOIN [${entry.TableName}]
	                    ON [${entry.TableName}].[${entry.IndexColumnName}] = [${entry.TemporalTableName}].[${entry.IndexColumnName}]
		            LEFT JOIN Users
		                ON [${entry.TableName}].UserID = Users.UserID
	                ${str}
				;`)).recordset
			}

			// Map from SQL DB to the local ActivityEvent type.
			let res = events.map(async (row: any) => {
				let result_event = {} as any
				result_event.$_parent_id = Decrypt(row.uid)
				result_event.timestamp = parseInt(row.timestamp)
				result_event.duration = parseInt(row.duration)

				// Map internal ID sub-components into the single mangled ID form.
				// FIXME: Currently it's not feasible to map SurveyID from SurveyName.
				result_event.activity = entry.ActivityIndexID === 1 /* survey */ ? undefined : 
										Identifier.activity_pack({ activity_spec_id: entry.ActivityIndexID, admin_id: row.aid, survey_id: 0 })

				// Copy static data fields if declared.
				result_event.static_data = {}
				if (!!entry.Slot1ColumnName)
					result_event.static_data[entry.Slot1Name] = row[`static_data.${entry.Slot1Name}`]
				if (!!entry.Slot2ColumnName)
					result_event.static_data[entry.Slot2Name] = row[`static_data.${entry.Slot2Name}`]
				if (!!entry.Slot3ColumnName)
					result_event.static_data[entry.Slot3Name] = row[`static_data.${entry.Slot3Name}`]
				if (!!entry.Slot4ColumnName)
					result_event.static_data[entry.Slot4Name] = row[`static_data.${entry.Slot4Name}`]
				if (!!entry.Slot5ColumnName)
					result_event.static_data[entry.Slot5Name] = row[`static_data.${entry.Slot5Name}`]

				// Decrypt all static data properties if known to be encrypted.
				// TODO: Encryption of fields should also be found in the ActivityIndex table!
				if (!!result_event.static_data.survey_name)
					result_event.static_data.survey_name = Decrypt(result_event.static_data.survey_name) || result_event.static_data.survey_name
				if (!!result_event.static_data.drawn_fig_file_name) {
					let fname = 'https://psych.digital/LampWeb/Games/User3DFigures/' + (Decrypt(result_event.static_data.drawn_fig_file_name) || result_event.static_data.drawn_fig_file_name)
					result_event.static_data.drawn_figure = fname//(await Download(fname)).toString('base64')
					result_event.static_data.drawn_fig_file_name = undefined
				}
                if (!!result_event.static_data.scratch_file_name) {
                    let fname = 'https://psych.digital/LampWeb/Games/UserScratchImages/' + (Decrypt(result_event.static_data.scratch_file_name) || result_event.static_data.scratch_file_name)
                    result_event.static_data.scratch_figure = fname//(await Download(fname)).toString('base64')
                    result_event.static_data.scratch_file_name = undefined
                }
				if (!!result_event.static_data.game_name)
					result_event.static_data.game_name = Decrypt(result_event.static_data.game_name) || result_event.static_data.game_name
				if (!!result_event.static_data.collected_stars)
					result_event.static_data.collected_stars = Decrypt(result_event.static_data.collected_stars) || result_event.static_data.collected_stars
				if (!!result_event.static_data.total_jewels_collected)
					result_event.static_data.total_jewels_collected = Decrypt(result_event.static_data.total_jewels_collected) || result_event.static_data.total_jewels_collected
				if (!!result_event.static_data.total_bonus_collected)
					result_event.static_data.total_bonus_collected = Decrypt(result_event.static_data.total_bonus_collected) || result_event.static_data.total_bonus_collected
				if (!!result_event.static_data.score)
					result_event.static_data.score = Decrypt(result_event.static_data.score) || result_event.static_data.score

				// Copy all temporal events for this result event by matching parent ID.
				if (!!slices) {
					result_event.temporal_events = slices
						.filter(slice_row => slice_row.parent_id === row.id)
						.map(slice_row => {
							let temporal_event = {} as any
							temporal_event.item = slice_row.item
							temporal_event.value = slice_row.value
							temporal_event.type = slice_row.type
							temporal_event.duration = parseInt(slice_row.duration)
							temporal_event.level = slice_row.level

							// Special treatment for surveys with encrypted answers.
							if (entry.ActivityIndexID === '1' /* survey */) {
								temporal_event.item = Decrypt(temporal_event.item) || temporal_event.item
								temporal_event.value = Decrypt(temporal_event.value) || temporal_event.value
								temporal_event.type = !temporal_event.type ? undefined : (<string>temporal_event.type).toLowerCase()

								// Adjust the Likert scaled values to numbers.
								if (["Not at all", "12:00AM - 06:00AM", "0-3"].indexOf(temporal_event.value) >= 0) {
									temporal_event.value = 0
								} else if (["Several Times", "06:00AM - 12:00PM", "3-6"].indexOf(temporal_event.value) >= 0) {
									temporal_event.value = 1
								} else if (["More than Half the Time", "12:00PM - 06:00PM", "6-9"].indexOf(temporal_event.value) >= 0) {
									temporal_event.value = 2
								} else if (["Nearly All the Time", "06:00PM - 12:00AM", ">9"].indexOf(temporal_event.value) >= 0) {
									temporal_event.value = 3
								}
							}
							return temporal_event
						})
				}

				// Finally return the newly created event.
				return result_event
			})
			return (<ActivityEvent[]>[]).concat(...(await Promise.all(res)))
		})
		return (<ActivityEvent[]>[]).concat(...(await Promise.all(result)))
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		throw new Error('unsupported')
	}
}

export class SensorEvent {
	public static async _select(change_version?: string): Promise<any[]> {
		let id: string | undefined = undefined
		let activity_id_or_spec: string | undefined = undefined
		let from_date: number | undefined = undefined
		let to_date: number | undefined = undefined

		const _decrypt = function(str: string) { let v = Decrypt(str); return (!v || v === '' || v === 'NA') ? null : v.toLowerCase() }
		const _convert = function(x: string | null, strip_suffix: string = '', convert_number: boolean = false) { return !x ? null : (convert_number ? parseFloat(x.replace(strip_suffix, '')) : x.replace(strip_suffix, '')) }
		const _clean = function(x: any) { return x === 0 ? null : x }
		const toLAMP = (value?: string): [string?, string?] => {
			if (!value) return []
			let matches = (Decrypt(value) || value).toLowerCase()
							.match(/(?:i am )([ \S\/]+)(alone|in [ \S\/]*|with [ \S\/]*)/) || []
			return [
				(<any>{
					'home': 'home',
					'in school/class': 'school',
					'at work': 'work',
					'in clinic/hospital': 'hospital',
					'outside': 'outside',
					'shopping/dining': 'shopping',
					'in bus/train/car': 'transit',
				})[(matches[1] || ' ').slice(0, -1)],
				(<any>{
					'alone': 'alone',
					'with friends': 'friends',
					'with family': 'family',
					'with peers': 'peers',
					'in crowd': 'crowd',
				})[(matches[2] || '')]
			]
		}
		const fromLAMP = (value: [string?, string?]): string | undefined => {
			if (!value[0] && !value[1]) return undefined
			return Encrypt('i am' + (<any>{
				'home': ' home',
				'school': ' in school/class',
				'work': ' at work',
				'hospital': ' in clinic/hospital',
				'outside': ' outside',
				'shopping': ' shopping/dining',
				'transit': ' in bus/train/car',
			})[(value[0] || '')] + (<any>{
				'alone': 'alone',
				'friends': 'with friends',
				'family': 'with family',
				'peers': 'with peers',
				'crowd': 'in crowd',
			})[(value[1] || '')])
		}
		const HK_to_LAMP = {
			'lamp.height': (raw: string): any => ({ value: _convert(_decrypt(raw), ' cm', true), units: 'cm' }),
			'lamp.weight': (raw: string): any => ({ value: _convert(_decrypt(raw), ' kg', true), units: 'kg' }),
			'lamp.heart_rate': (raw: string): any => ({ value: _convert(_decrypt(raw), ' bpm', true), units: 'bpm' }),
			'lamp.blood_pressure': (raw: string): any => ({ value: _convert(_decrypt(raw), ' mmhg', false), units: 'mmHg' }),
			'lamp.respiratory_rate': (raw: string): any => ({ value: _convert(_decrypt(raw), ' breaths/min', true), units: 'bpm' }),
			'lamp.sleep': (raw: string): any => ({ value: _decrypt(raw), units: '' }),
			'lamp.steps': (raw: string): any => ({ value: _clean(_convert(_decrypt(raw), ' steps', true)), units: 'steps' }),
			'lamp.flights': (raw: string): any => ({ value: _clean(_convert(_decrypt(raw), ' steps', true)), units: 'flights' }),
			'lamp.segment': (raw: string): any => ({ value: _convert(_decrypt(raw), '', true), units: '' }),
			'lamp.distance': (raw: string): any => ({ value: _convert(_decrypt(raw), ' meters', true), units: 'meters' })
		}
		const LAMP_to_HK = { // TODO: Consider 0/NA values
			'lamp.height': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} cm`,
			'lamp.weight': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} kg`,
			'lamp.heart_rate': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} bpm`,
			'lamp.blood_pressure': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} mmhg`,
			'lamp.respiratory_rate': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} breaths/min`,
			'lamp.sleep': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)}`,
			'lamp.steps': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} steps`,
			'lamp.flights': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} steps`,
			'lamp.segment': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)}`,
			'lamp.distance': (obj: { value: any; units: string }): string => `${Encrypt(obj.value)} meters`,
		}
		const HK_LAMP_map = {
			'lamp.height': 'Height',
			'lamp.weight': 'Weight',
			'lamp.heart_rate': 'HeartRate',
			'lamp.blood_pressure': 'BloodPressure',
			'lamp.respiratory_rate': 'RespiratoryRate',
			'lamp.sleep': 'Sleep',
			'lamp.steps': 'Steps',
			'lamp.flights': 'FlightClimbed',
			'lamp.segment': 'Segment',
			'lamp.distance': 'Distance',
			'Height': 'lamp.height',
			'Weight': 'lamp.weight',
			'HeartRate': 'lamp.heart_rate',
			'BloodPressure': 'lamp.blood_pressure',
			'RespiratoryRate': 'lamp.respiratory_rate',
			'Sleep': 'lamp.sleep',
			'Steps': 'lamp.steps',
			'FlightClimbed': 'lamp.flights',
			'Segment': 'lamp.segment',
			'Distance': 'lamp.distance',
		}

		enum SensorName {
			Analytics = 'lamp.analytics',
			Accelerometer = 'lamp.accelerometer',
			Bluetooth = 'lamp.bluetooth',
			Calls = 'lamp.calls',
			DeviceState = 'lamp.device_state',
			SMS = 'lamp.sms',
			WiFi = 'lamp.wifi',
			Audio = 'lamp.audio_recordings',
			Location = 'lamp.gps',
			ContextualLocation = 'lamp.gps.contextual',
			Height = 'lamp.height',
			Weight = 'lamp.weight',
			HeartRate = 'lamp.heart_rate',
			BloodPressure = 'lamp.blood_pressure',
			RespiratoryRate = 'lamp.respiratory_rate',
			Sleep = 'lamp.sleep',
			Steps = 'lamp.steps',
			Flights = 'lamp.flights',
			Segment = 'lamp.segment',
			Distance = 'lamp.distance',
		}

		// Get the correctly scoped identifier to search within.
		let user_id: string | undefined
		let admin_id: number | undefined
		if (!!id && Identifier.unpack(id)[0] === (<any>Researcher).name)
			admin_id = Identifier.researcher_unpack(id).admin_id
		else if (!!id && Identifier.unpack(id).length === 0 /* Participant */)
			user_id = Identifier.participant_unpack(id).study_id
		else if(!!id) throw new Error()
		user_id = !!user_id ? Encrypt(user_id) : undefined

		let result1 = (await SQL!.request().query(`
				SELECT timestamp, type, data, X.StudyId AS parent
				FROM (
					SELECT
						Users.AdminID, 
						Users.StudyId, 
						Users.IsDeleted,
						DATEDIFF_BIG(MS, '1970-01-01', U.CreatedOn) AS timestamp, 
						U.type,
						U.data
					FROM HealthKit_DailyValues
					UNPIVOT (data FOR type IN (
						Height, Weight, HeartRate, BloodPressure, 
						RespiratoryRate, Sleep, Steps, FlightClimbed, 
						Segment, Distance
					)) U
					LEFT JOIN Users
					    ON U.UserID = Users.UserID
					WHERE U.data != ''
                	${!!change_version ? 'AND 1=0' : ''}
					UNION ALL 
					SELECT
						Users.AdminID, 
						Users.StudyId, 
						Users.IsDeleted,
					    DATEDIFF_BIG(MS, '1970-01-01', DateTime) AS timestamp,
					    REPLACE(HKParamName, ' ', '') AS type,
					    Value AS data
					FROM HealthKit_ParamValues
					LEFT JOIN Users
					    ON HealthKit_ParamValues.UserID = Users.UserID
					LEFT JOIN HealthKit_Parameters
					    ON HealthKit_Parameters.HKParamID = HealthKit_ParamValues.HKParamID
                	${!!change_version ? `WHERE HKParamValueID IN (SELECT C.HKParamValueID FROM CHANGETABLE(CHANGES HealthKit_ParamValues, ${change_version}) AS C WHERE SYS_CHANGE_OPERATION = 'I' AND SYS_CHANGE_CONTEXT IS NULL)` : ''}
				) X
				WHERE 1=1
                ${!!user_id ? `AND X.StudyId = '${user_id}'` : ''}
                ${!!admin_id ? `AND X.AdminID = '${admin_id}'` : ''}
                ${!!from_date ? `AND X.timestamp >= ${from_date}` : ''}
                ${!!to_date ? `AND X.timestamp <= ${to_date}` : ''}
		;`)).recordset.map((raw: any) => {
			let obj = {} as any
			obj.$_parent_id = Decrypt(raw.parent)
			obj.timestamp = raw.timestamp
			obj.sensor = <SensorName>Object.entries(HK_LAMP_map).filter(x => x[1] === (<string>raw.type))[0][0]
			obj.data = ((<any>HK_to_LAMP)[obj.sensor!] || ((x: any) => x))(raw.data)
			return obj
		})
		let result2 = (await SQL!.request().query(`
			SELECT 
                DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) AS timestamp,
                Latitude AS lat,
                Longitude AS long,
                LocationName AS location_name,
                Users.StudyId AS parent
            FROM Locations
            LEFT JOIN Users
                ON Locations.UserID = Users.UserID
            WHERE 1=1
                ${!!user_id ? `AND Users.StudyId = '${user_id}'` : ''}
                ${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ''}
                ${!!from_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) >= ${from_date}` : ''}
                ${!!to_date ? `AND DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) <= ${to_date}` : ''}
                ${!!change_version ? `AND LocationID IN (SELECT C.LocationID FROM CHANGETABLE(CHANGES Locations, ${change_version}) AS C WHERE SYS_CHANGE_OPERATION = 'I' AND SYS_CHANGE_CONTEXT IS NULL)` : ''}
		;`)).recordset.map((raw: any) => {
			let x = toLAMP(raw.location_name)
			let obj = {} as any
			obj.$_parent_id = Decrypt(raw.parent)
			obj.timestamp = raw.timestamp
			obj.sensor = 'lamp.gps.contextual'
			obj.data = {
				latitude: parseFloat(Decrypt(raw.lat) || raw.lat),
				longitude: parseFloat(Decrypt(raw.long) || raw.long),
				accuracy: 1,
				context: {
					environment: x[0] || null,
					social: x[1] || null
				}
			}
			return obj
		})
		return [...result1, ...result2].sort((a, b) => (<number>a.timestamp) - (<number>b.timestamp))
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		throw new Error('unsupported')
	}
}

export class Credential {
	public static async _select(change_version?: string): Promise<any[]> {
		throw new Error('unsupported')
	}

	public static async _upsert(documents: any[]): Promise<any[]> {
		throw new Error('unsupported')
	}
}
