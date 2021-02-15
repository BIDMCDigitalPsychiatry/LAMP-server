import { Database } from "./Bootstrap"
import { ActivitySpec } from "../model/ActivitySpec"
import { ActivitySpecModel } from "../model/ActivitySpec"

export class ActivitySpecRepository {
  public static async _select(id?: string): Promise<ActivitySpec[]> {
    if (process.env.DB_DRIVER === "couchdb") {
      const data = await Database.use("activity_spec").list({ include_docs: true, start_key: id, end_key: id })
      return (data.rows as any).map((x: any) => ({
        id: x.doc._id,
        name: x.doc._id,
        ...x.doc,
        _id: undefined,
        _rev: undefined,
      }))
    } else {
      const data = !!id ? await ActivitySpecModel.find({ _id: id }) : await ActivitySpecModel.find({})
      return (data as any).map((x: any) => ({
        id: x._doc._id,
        name: x._doc._id,
        ...x._doc,
        _id: undefined,
        _rev: undefined,
        __v: undefined,
      }))
    }
  }
  public static async _insert(object: ActivitySpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public static async _update(id: string, object: ActivitySpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public static async _delete(id: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
}
