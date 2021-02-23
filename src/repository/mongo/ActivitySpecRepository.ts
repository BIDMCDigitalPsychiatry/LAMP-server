import { ActivitySpec } from "../../model/ActivitySpec"
import { ActivitySpecModel } from "../../model/ActivitySpec"
import { ActivitySpecInterface } from "../interface/RepositoryInterface"

export class ActivitySpecRepository implements ActivitySpecInterface {
  public async _select(id?: string): Promise<ActivitySpec[]> {
    const data = !!id ? await ActivitySpecModel.find({ _id: id }) : await ActivitySpecModel.find({})
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      name: x._doc._id,
      ...x._doc,
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
