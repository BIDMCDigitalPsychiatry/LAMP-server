import { Database } from "../app"
import { SensorSpec } from "../model/SensorSpec"

export class SensorSpecRepository {
  /**
   * Get a set of `SensorSpec`s matching the criteria parameters.
   */
  public static async _select(
    /**
     * The identifier of the object or any parent.
     */
    id?: string
  ): Promise<SensorSpec[]> {
    let data = await Database.use("sensor_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined
    }))
  }

  /**
   * Create a `SensorSpec` with a new object.
   */
  public static async _insert(
    /**
     * The new object.
     */
    object: SensorSpec
  ): Promise<string> {
    // TODO: SensorSpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Update a `SensorSpec` with new fields.
   */
  public static async _update(
    /**
     *
     */
    sensor_spec_name: string,

    /**
     * The replacement object or specific fields within.
     */
    object: SensorSpec
  ): Promise<string> {
    // TODO: SensorSpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Delete a `SensorSpec` row.
   */
  public static async _delete(
    /**
     *
     */
    sensor_spec_name: string
  ): Promise<string> {
    // TODO: SensorSpecs do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }
}
