import { Database } from "../app"
import { Sensor } from "../model/Sensor"

export class SensorRepository {
  /**
   * Get a set of `Sensor`s matching the criteria parameters.
   */
  public static async _select(
    /**
     * The identifier of the object or any parent.
     */
    id?: string
  ): Promise<Sensor[]> {
    let data = await Database.use("sensor").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined
    }))
  }

  /**
   * Create a `Sensor` with a new object.
   */
  public static async _insert(
    id: string,
    /**
     * The new object.
     */
    object: Sensor
  ): Promise<string> {
    // TODO: Sensors do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Update a `Sensor` with new fields.
   */
  public static async _update(
    /**
     *
     */
    sensor_spec_name: string,

    /**
     * The replacement object or specific fields within.
     */
    object: Sensor
  ): Promise<string> {
    // TODO: Sensors do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }

  /**
   * Delete a `Sensor` row.
   */
  public static async _delete(
    /**
     *
     */
    sensor_spec_name: string
  ): Promise<string> {
    // TODO: Sensors do not exist! They cannot be modified!
    throw new Error("503.unimplemented")
    return ""
  }
}
