import { uuid } from "../Bootstrap"
import { Sensor } from "../../model/Sensor"
import { SensorInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class SensorRepository implements SensorInterface {
  public async _select(id: string | null, parent = false, ignore_binary = false): Promise<Sensor[]> {
    const data = await MongoClientDB.collection("sensor")
      .aggregate([
        parent
          ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
          : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
        ignore_binary ? { $project: { name: 1 } } : { $project: { name: 1, settings: 1 } },
        { $sort: { timestamp: 1 } },
        { $limit: 2_147_483_647 },
      ])
      .maxTimeMS(60000)
      .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      _deleted: undefined,
      settings: ignore_binary ? undefined : x.settings,
    }))
  }
  public async _insert(study_id: string, object: any /*Sensor*/): Promise<string> {
    const _id = uuid()
    await MongoClientDB.collection("sensor").insertOne({
      _id: _id,
      _parent: study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      _deleted: false,
    })
    return _id
  }

  public async _update(sensor_id: string, object: any /*Sensor*/): Promise<{}> {
    const orig: any = await MongoClientDB.collection("sensor").findOne(sensor_id)
    await MongoClientDB.collection("sensor").findOneAndUpdate(
      { _id: orig._id },
      {
        $set: { name: object.name ?? orig.name, settings: object.settings ?? orig.settings },
      }
    )

    return {}
  }

  public async _delete(sensor_id: string): Promise<{}> {
    try {
      await MongoClientDB.collection("sensor").updateOne({ _id: sensor_id }, { $set: { _deleted: true } })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  /** There would be a need for pagination of the data without settings. So, its seperately written
   *
   * @param  string id
   * @param boolean parent
   * @returns Array Sensor[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Sensor[]> {
    const data = await MongoClientDB.collection("sensor")
      .aggregate([
        parent
          ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
          : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
        { $project: { name: 1, _parent: 1, spec:1 } },
        { $sort: { timestamp: 1 } },
        { $limit: 2_147_483_647 },
      ])
      .maxTimeMS(120000)
      .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      study_id: x._parent,
      settings: undefined,
      __v: undefined,
      _deleted: undefined,
      timestamp: undefined,
    }))
  }
}
