import { Database } from "./Bootstrap"
import { SensorSpec } from "../model/SensorSpec"
import { SensorSpecModel } from "../model/SensorSpec"

export class SensorSpecRepository {
  public static async _select(id?: string): Promise<SensorSpec[]> {
    if (process.env.DB_DRIVER === "couchdb") {
      const data = await Database.use("sensor_spec").list({ include_docs: true, start_key: id, end_key: id })
      return (data.rows as any).map((x: any) => ({
        id: x.doc._id,
        ...x.doc,
        _id: undefined,
        _rev: undefined,
      }))
    } else {
      const data = !!id ? await SensorSpecModel.find({ _id: id }) : await SensorSpecModel.find({})
      return (data as any).map((x: any) => ({
        id: x._doc._id,
        name: x._doc._id,
        ...x._doc,
        _id: undefined,
        __v: undefined,
      }))
    }
  }
  public static async _insert(objects: []): Promise<{}> {
    throw new Error("503.unimplemented")
  }

  public static async _update(id: string, object: SensorSpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public static async _delete(id: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
}
