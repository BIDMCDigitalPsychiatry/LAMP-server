import { SensorSpec } from "../../model/SensorSpec"
import { SensorSpecModel } from "../../model/SensorSpec"
import { SensorSpecInterface } from "../interface/RepositoryInterface"

export class SensorSpecRepository implements SensorSpecInterface {
  public async _select(id?: string): Promise<SensorSpec[]> {
    const data = !!id ? await SensorSpecModel.find({ _id: id }) : await SensorSpecModel.find({})
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      name: x._doc._id,
      ...x._doc,
      _id: undefined,
      __v: undefined,
    }))
  }
  public async _insert(objects: SensorSpec): Promise<string> {
    throw new Error("503.unimplemented")
  }

  public async _update(id: string, object: SensorSpec): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public async _delete(id: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
}
