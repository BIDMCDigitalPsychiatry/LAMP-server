import { Database } from "../../app"
import { ActivitySpec } from "../../model/ActivitySpec"

export class ActivitySpecRepository {
  /**
   * Get a set of `ActivitySpec`s matching the criteria parameters.
   */
  public static async _select(
    /**
     * The identifier of the object or any parent.
     */
    id?: string
  ): Promise<ActivitySpec[]> {
    const data = await Database.use("activity_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      name: x.doc.id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
    }))
  }

  /**
   * Create a `ActivitySpec` with a new object.
   */
  public static async _insert(
    /**
     * The new object.
     */
    object: ActivitySpec
  ): Promise<string> {
    // TODO: ActivitySpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Update a `ActivitySpec` with new fields.
   */
  public static async _update(
    /**
     * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
     */
    activity_spec_name: string,

    /**
     * The replacement object or specific fields within.
     */
    object: ActivitySpec
  ): Promise<string> {
    // TODO: ActivitySpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Delete a `ActivitySpec` row.
   */
  public static async _delete(
    /**
     * The `ActivityIndexID` column of the `ActivityIndex` table in the LAMP_Aux DB.
     */
    activity_spec_name: string
  ): Promise<string> {
    // TODO: ActivitySpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }
}
