import { ActivitySpec } from "../../model/ActivitySpec"
import { ActivitySpecInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ActivitySpecRepository implements ActivitySpecInterface {
  public async _select(id?: string): Promise<ActivitySpec[]> {
    const data = !!id
      ? await MongoClientDB.collection("activity_spec").find({ _id: id }).maxTimeMS(60000).toArray()
      : await MongoClientDB.collection("activity_spec").find({}).maxTimeMS(60000).toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      name: x._id,
      ...x,
      _id: undefined,
      __v: undefined,
    }))
  }
  public async _insert(object: ActivitySpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public async _update(id: string, object: ActivitySpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public async _delete(id: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
}
