import { SensorSpec } from "../../model/SensorSpec"
import { SensorSpecInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class SensorSpecRepository implements SensorSpecInterface {
  public async _select(id?: string): Promise<SensorSpec[]> {
    const data = !!id
      ? await MongoClientDB.collection("sensor_spec").find({$or: [ { _deleted: false,  _id: id }, { _deleted: undefined, _id: id } ]}).maxTimeMS(60000).toArray()
      : await MongoClientDB.collection("sensor_spec").find({$or: [ { _deleted: false }, { _deleted: undefined } ]}).maxTimeMS(60000).toArray()
    return (data as any).map((x: any) => ({          
      id: x._id,
      ...x,
      _id: undefined,
      __v: undefined,
      _deleted: undefined,
    }))
  }
  public async _insert(object: SensorSpec): Promise<{}> {
    try {
      await MongoClientDB.collection("sensor_spec").insertOne({
        _id: object.name,
         settings_schema: object.settings_schema ?? {},
        _deleted: false,
      } as any)
      return {}
    } catch (error) {
      throw new Error("500.sensorspec-creation-failed")
    }
  }

  public async _update(id: string, object: SensorSpec): Promise<{}> {
    const orig: any = await MongoClientDB.collection("sensor_spec").findOne({ _id: id })
    await MongoClientDB.collection("sensor_spec").findOneAndUpdate(
      { _id: orig._id },
      {
        $set: {
          settings_schema: object.settings_schema ?? orig.settings_schema
        },
      }
    )
    return {}
  }
  public async _delete(id: string): Promise<{}> {
    try {
      await MongoClientDB.collection("sensor_spec").updateOne({ _id: id }, { $set: { _deleted: true } })
    } catch (e) {
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
