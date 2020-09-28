import { Database } from "../app"
import { ActivitySpec } from "../model/ActivitySpec"

export class ActivitySpecRepository {
  public static async _select(id?: string): Promise<ActivitySpec[]> {
    const data = await Database.use("activity_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      name: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
    }))
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
