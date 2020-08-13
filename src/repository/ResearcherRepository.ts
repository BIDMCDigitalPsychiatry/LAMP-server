import { SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { StudyRepository } from "../repository/StudyRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"

export class ResearcherRepository {
  /**
   *
   */
  public static _pack_id(components: {
    /**
     *
     */
    admin_id?: number
  }): string {
    return Identifier_pack([(<any>Researcher).name, components.admin_id || 0])
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
    admin_id: number
  } {
    const components = Identifier_unpack(id)
    if (components[0] !== (<any>Researcher).name) throw new Error("400.invalid-identifier")
    const result = components.slice(1).map((x) => Number.parse(x) ?? 0)
    return {
      admin_id: result[0],
    }
  }

  /**
   *
   */
  public static async _parent_id(id: string, type: Function): Promise<string | undefined> {
    const { admin_id } = ResearcherRepository._unpack_id(id)
    switch (type) {
      default:
        return undefined // throw new Error('400.invalid-identifier')
    }
  }

  /**
   *
   */
  public static async _select(
    /**
     *
     */
    id?: string
  ): Promise<Researcher[]> {
    // Get the correctly scoped identifier to search within.
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id) throw new Error("400.invalid-identifier")

    const result = await SQL!.request().query(`
			SELECT 
                AdminID as id, 
                FirstName AS name, 
                LastName AS lname,
                Email AS email,
                (
                    SELECT 
                        AdminID AS id
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ) AS studies
            FROM Admin
            WHERE 
            	IsDeleted = 0 
            	${!!admin_id ? `AND AdminID = '${admin_id}'` : ""}
            FOR JSON PATH, INCLUDE_NULL_VALUES;
		`)
    if (result.recordset.length === 0 || result.recordset[0] === null) return []
    return result.recordset[0].map((raw: any) => {
      const obj = new Researcher()
      obj.id = ResearcherRepository._pack_id({ admin_id: raw.id })
      obj.name = [Decrypt(raw.name), Decrypt(raw.lname)].join(" ")
      obj.email = Decrypt(raw.email)
      obj.studies = raw.studies.map((x: any) => StudyRepository._pack_id({ admin_id: x.id }))
      return obj
    })
  }

  /**
   * Create a `Researcher` with a new object.
   */
  public static async _insert(
    /**
     * The new object.
     */
    object: Researcher
  ): Promise<string> {
    // Prepare SQL row-columns from JSON object-fields.
    //password: Encrypt((<any>object).password, 'AES256')
    const result = await SQL!.request().query(`
			INSERT INTO Admin (
                Email, 
                FirstName, 
                LastName, 
                CreatedOn, 
                AdminType
            )
            OUTPUT INSERTED.AdminID AS id
			VALUES (
		        '${Encrypt(object.email!)}',
		        '${Encrypt(object.name!.split(" ")[0])}',
		        '${Encrypt(object.name!.split(" ").slice(1).join(" "))}',
		        GETDATE(), 
		        2
			);
		`)
    if (result.recordset.length === 0) throw new Error("400.create-failed")

    const result2 = await SQL!.request().query(`
			INSERT INTO Admin_CTestSettings (
				AdminID,
				CTestID,
				Status,
				Notification
			)
			SELECT
				${result.recordset[0]["id"]},
				CTestID,
				0,
				0
			FROM CTest;
    `)

    // Default value for Saving JewelsTrailsASettings
    const result3 = await SQL!.request().query(`
			INSERT INTO Admin_JewelsTrailsASettings (
				NoOfSeconds_Adv,
				NoOfSeconds_Beg,
        NoOfSeconds_Exp,
        NoOfSeconds_Int,
        NoOfDiamonds,
        NoOfShapes,
        NoOfBonusPoints,
        X_NoOfChangesInLevel,
        X_NoOfDiamonds,
        Y_NoOfChangesInLevel,
        Y_NoOfShapes,
        AdminID
			)
      VALUES (
        25,
        90,
        15,
        30,
        25,
        1,
        50,
        1,
        1,
        1,
        1,
        ${result.recordset[0]["id"]}
      )
    `)

    // Default value for Saving JewelsTrailsBSettings
    const result4 = await SQL!.request().query(`
			INSERT INTO Admin_JewelsTrailsBSettings (
				NoOfSeconds_Adv,
				NoOfSeconds_Beg,
        NoOfSeconds_Exp,
        NoOfSeconds_Int,
        NoOfDiamonds,
        NoOfShapes,
        NoOfBonusPoints,
        X_NoOfChangesInLevel,
        X_NoOfDiamonds,
        Y_NoOfChangesInLevel,
        Y_NoOfShapes,
        AdminID
			)
      VALUES (
        60,
        180,
        45,
        90,
        25,
        2,
        50,
        1,
        1,
        1,
        2,
        ${result.recordset[0]["id"]}
      )
    `)

    // Return the new row's ID.
    return ResearcherRepository._pack_id({ admin_id: result.recordset[0]["id"] })
  }

  /**
   * Update a `Researcher` with new fields.
   */
  public static async _update(
    /**
     * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
     */
    researcher_id: string,

    /**
     * The replacement object or specific fields within.
     */
    object: Researcher
  ): Promise<{}> {
    const admin_id = ResearcherRepository._unpack_id(researcher_id).admin_id

    // Prepare the minimal SQL column changes from the provided fields.
    const updates: string[] = []
    if (!!object.name) {
      updates.push(`FirstName = '${Encrypt(object.name.split(" ")[0])}'`)
      updates.push(`LastName = '${Encrypt(object.name.split(" ").slice(1).join(" "))}'`)
    }
    if (!!object.email) updates.push(`Email = '${Encrypt(object.email)}'`)
    //if (!!(<any>object).password)
    //	updates.push(`Password = '${Encrypt((<any>object).password, 'AES256')}'`)

    if (updates.length == 0) throw new Error("400.updates-failed")

    // Update the specified fields on the selected Admin row.
    const result = await SQL!.request().query(`
			UPDATE Admin SET ${updates.join(", ")} WHERE AdminID = ${admin_id};
		`)

    return {} //result.recordset[0]
  }

  /**
   * Delete a `Researcher` row.
   */
  public static async _delete(
    /**
     * The `AdminID` column of the `Admin` table in the LAMP v0.1 DB.
     */
    researcher_id: string
  ): Promise<{}> {
    const admin_id = ResearcherRepository._unpack_id(researcher_id).admin_id
    if (admin_id === 1) throw new Error("400.delete-failed")

    // Set the deletion flag, without actually deleting the row.
    const result = await SQL!.request().query(`
			UPDATE Admin SET IsDeleted = 1 WHERE AdminID = ${admin_id} AND IsDeleted = 0;
		`)
    if (result.rowsAffected[0] === 0) throw new Error("404.object-not-found")
    return {}
  }
}
