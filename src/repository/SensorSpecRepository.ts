import { Database } from "../app"
import { SensorSpec } from "../model/SensorSpec"

export class SensorSpecRepository {
  public static async _select(id?: string): Promise<SensorSpec[]> {
    const data = await Database.use("sensor_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
    }))
  }
  public static async _insert(object: SensorSpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public static async _update(id: string, object: SensorSpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public static async _delete(id: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
}
