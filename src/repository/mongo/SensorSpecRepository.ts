import { SensorSpec } from "../../model/SensorSpec"
import { SensorSpecInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class SensorSpecRepository implements SensorSpecInterface {
  public async _select(id?: string, ignore_binary?: boolean): Promise<SensorSpec[]> {
    const data = !!id
      ? await MongoClientDB.collection("sensor_spec")
          .find({
            $or: [
              { _deleted: false, _id: id },
              { _deleted: undefined, _id: id },
            ],
          })
          .maxTimeMS(60000)
          .toArray()
      : await MongoClientDB.collection("sensor_spec")
          .find({ $or: [{ _deleted: false }, { _deleted: undefined }] })
          .maxTimeMS(60000)
          .toArray()

    return (data as any).map((x: any) => {
      if (!!ignore_binary) {
        delete x.settings_schema
      }
      return {
        id: x._id,
        ...x,
        _id: undefined,
        __v: undefined,
        _deleted: undefined,
      }
    })
  }
  public async _insert(object: SensorSpec): Promise<{}> {
    try {
      let res: any = await MongoClientDB.collection("sensor_spec").findOne({ _id: object.name, _deleted: false })
      if (res !== null) {
        throw new Error("500.SensorSpec-already-exists")
      } else {
        res = await MongoClientDB.collection("sensor_spec").findOne({ _id: object.name, _deleted: true })
        if (res === null) {
          await MongoClientDB.collection("sensor_spec").insertOne({
            _id: object.name,
            settings_schema: object.settings_schema ?? {},
            _deleted: false,
          } as any)
        } else {
          await MongoClientDB.collection("sensor_spec").findOneAndUpdate(
            { _id: object.name },
            {
              $set: {
                _deleted: false,
              },
            }
          )
        }
      }
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
          settings_schema: object.settings_schema ?? orig.settings_schema,
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
