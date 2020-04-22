import { SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { Participant } from "../model/Participant"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"

export class ParticipantRepository {
  /**
   *
   */
  public static _pack_id(components: {
    /**
     *
     */
    study_id?: string
  }): string {
    return components.study_id || ""
  }

  /**
   *
   */
  public static _unpack_id(
    id: string
  ): {
    /**
     *
     */
    study_id: string
  } {
    return { study_id: <string>id }
  }

  /**
   *
   */
  public static async _parent_id(id: string, type: Function): Promise<string | undefined> {
    let { study_id } = ParticipantRepository._unpack_id(id)
    switch (type) {
      case StudyRepository:
      case ResearcherRepository:
        let result = (
          await SQL!.request().query(`
                    SELECT AdminID AS value
                    FROM Users
                    WHERE IsDeleted = 0 AND StudyId = '${Encrypt(study_id)}';
				`)
        ).recordset
        return result.length === 0
          ? undefined
          : (type === ResearcherRepository ? ResearcherRepository : StudyRepository)._pack_id({
              admin_id: result[0].value
            })

      default:
        throw new Error("400.invalid-identifier")
    }
  }

  /**
   * Get a set of `Participant`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string
  ): Promise<Participant[]> {
    // Get the correctly scoped identifier to search within.
    let user_id: string | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      user_id = ParticipantRepository._unpack_id(id).study_id
    else if (!!id) throw new Error("400.invalid-identifier")

    // Collect the set of legacy Activity tables and stitch the full query.
    let activities_list = (
      await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.ActivityIndex;
		`)
    ).recordset

    // Construct N sub-objects for each of N activities.
    // Perform complex lookup, returning a JSON object set.
    let result = await SQL!.request().query(`
            SELECT 
                StudyId AS id, 
                StudyCode AS study_code, 
                AppColor AS [theme], 
                Language AS [language], 
                (
                    SELECT [24By7ContactNo]
                    WHERE [24By7ContactNo] != ''
                ) AS [emergency_contact],
                (
                    SELECT PersonalHelpline
                    WHERE PersonalHelpline != ''
                ) AS [helpline]
            FROM Users
            FULL OUTER JOIN UserSettings
                ON UserSettings.UserID = Users.UserID
            FULL OUTER JOIN UserDevices
                ON UserDevices.UserID = Users.UserID
            WHERE 
            	Users.IsDeleted = 0 
            	${!!user_id ? `AND Users.StudyId = '${Encrypt(user_id)}'` : ""} 
            	${!!admin_id ? `AND Users.AdminID = '${admin_id}'` : ""}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
	    `)

    if (result.recordset.length === 0 || !result.recordset[0]) return []

    // Map from SQL DB to the local Participant type.
    return result.recordset[0].map((raw: any) => {
      let obj = new Participant()
      obj.id = Decrypt(raw.id)
      //obj.language = raw.language || "en"
      //obj.theme = !!raw.theme ? Decrypt(raw.theme!) : undefined
      //obj.emergency_contact = raw.emergency_contact
      //obj.helpline = raw.helpline
      return obj
    })
  }

  /**
   * Create a `Participant`.
   */
  public static async _insert(
    /**
     * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
     */
    study_id: string,

    /**
     * The patch fields of the `Participant` object.
     */
    object: Participant
  ): Promise<any> {
    let admin_id = StudyRepository._unpack_id(study_id).admin_id

    // Create a fake email and study ID to allow login on the client app.
    let _id = `U${Math.random()
      .toFixed(10)
      .slice(2, 12)}`

    // Prepare the likely required SQL column changes as above.
    let study_code = !!object.study_code ? `'${Encrypt(object.study_code)}'` : `'${Encrypt("001")}'`
    let theme = !!object.theme ? `'${Encrypt(object.theme!)}'` : `'dJjw5FK/FXK6qU32frXHvg=='`
    let language = !!object.language ? `'${Encrypt(object.language!)}'` : `'en'`
    let emergency_contact = !!object.emergency_contact ? `'${Encrypt(object.emergency_contact!)}'` : `''`
    let helpline = !!object.helpline ? `'${Encrypt(object.helpline!)}'` : `''`

    // Insert row, returning the generated primary key ID.
    let result1 = await SQL!.request().query(`
			INSERT INTO Users (
                Email, 
                Password,
                StudyCode, 
                StudyId, 
                CreatedOn, 
                Status,
                AdminID
            )
			VALUES (
		        '${Encrypt(_id + "@lamp.com")}', 
		        '',
		        ${study_code},
		        '${Encrypt(_id)}',
		        GETDATE(), 
		        1,
		        ${admin_id}
			);
			SELECT SCOPE_IDENTITY() AS id;
		`)

    // Bail early if we failed to create a User row.
    if (result1.recordset.length === 0) throw new Error("404.object-not-found")

    let result2 = await SQL!.request().query(`
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
			VALUES (
			    ${(<any>result1.recordset)[0]["id"]},
		        ${theme},
		        1,
		        1,
		        1,
		        1,
		        ${emergency_contact},
		        ${helpline},
		        '',
		        '',
		        ${language}
			);
		`)

    // Return the new row's ID.
    return { id: _id }
  }

  /**
   * Update a `Participant` with new fields.
   */
  public static async _update(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     * The patch fields of the `Participant` object.
     */
    object: Participant
  ): Promise<{}> {
    // TODO: Objects here are immutable!
    throw new Error("503.unimplemented")

    /*let user_id = Encrypt(ParticipantRepository._unpack_id(participant_id).study_id)

    // Prepare the minimal SQL column changes from the provided fields.
    let updatesA = [],
      updatesB = [] //, updatesC = []
    //if (!!((<any>object).password))
    //	updatesA.push(`'Password = '${Encrypt((<any>object).password, 'AES256') || 'NULL'}'`)
    if (!!object.study_code) updatesA.push(`StudyCode = '${Encrypt(object.study_code)}'`)
    if (!!object.theme) updatesB.push(`AppColor = '${Encrypt(object.theme!)}'`)
    if (!!object.language) updatesB.push(`Language = '${object.language!}'`)
    if (!!object.emergency_contact) updatesB.push(`24By7ContactNo = '${Encrypt(object.emergency_contact!)}'`)
    if (!!object.helpline) updatesB.push(`PersonalHelpline = '${Encrypt(object.helpline!)}'`)

    // Update the specified fields on the selected Users, UserSettings, or UserDevices row.
    let result1 = (
      await SQL!.request().query(`
            UPDATE Users 
            SET ${updatesA.join(", ")} 
            WHERE StudyId = ${user_id};
		`)
    ).recordset

    let result2 = (
      await SQL!.request().query(`
            UPDATE UserSettings 
            SET ${updatesB.join(", ")} 
            LEFT JOIN Users ON Users.UserID = UserSettings.UserID 
            WHERE StudyId = ${user_id};
		`)
    ).recordset

    // Return whether the operation was successful.
    return result1.length && result2.length ? {} : {}*/
  }

  /**
   * Delete a `Participant`.
   */
  public static async _delete(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string
  ): Promise<{}> {
    let user_id = Encrypt(ParticipantRepository._unpack_id(participant_id).study_id)

    // Set the deletion flag, without actually deleting the row.
    let res = await SQL!.request().query(`
			IF EXISTS(SELECT UserID FROM Users WHERE StudyId = '${user_id}' AND IsDeleted != 1)
				UPDATE Users SET IsDeleted = 1 WHERE StudyId = '${user_id}';
		`)

    if (res.rowsAffected.length === 0 || res.rowsAffected[0] === 0) throw new Error("404.object-not-found")
    return {}
  }
}
