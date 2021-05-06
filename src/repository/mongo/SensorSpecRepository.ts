import { SensorSpec } from "../../model/SensorSpec"
import { SensorSpecInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class SensorSpecRepository implements SensorSpecInterface {
  public async _select(id?: string): Promise<SensorSpec[]> {
    const data = !!id
      ? await MongoClientDB.collection("sensor_spec").find({ _id: id }).maxTimeMS(60000).toArray()
      : await MongoClientDB.collection("sensor_spec").find({}).maxTimeMS(60000).toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      name: x._id,
      ...x,
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
