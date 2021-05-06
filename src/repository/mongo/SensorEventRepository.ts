import { SensorEvent } from "../../model/SensorEvent"
import { SensorEventInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
// FIXME: does not support filtering by Sensor yet.

export class SensorEventRepository implements SensorEventInterface {
  public async _select(
    id?: string,
    sensor_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<SensorEvent[]> {
    let filteredQuery: any = {}
    if (!!id) {
      filteredQuery._parent = id
    }
    if (!!sensor_spec) {
      filteredQuery.sensor = sensor_spec
    }
    if (!!from_date) {
      filteredQuery.timestamp = { $gte: from_date }
    }
    if (!!to_date) {
      filteredQuery.timestamp = { $lt: from_date === to_date ? to_date! + 1 : to_date }
    }
    if (!!from_date && !!to_date) {
      filteredQuery.timestamp = { $gte: from_date, $lt: from_date === to_date ? to_date! + 1 : to_date }
    }
    const all_res = await MongoClientDB.collection("sensor_event")
      .find(filteredQuery)
      .sort({ timestamp: !!limit && limit < 0 ? 1 : -1 })
      .limit(limit ?? 1)
      .maxTimeMS(60000)
      .toArray()
    return (all_res as any).map((x: any) => ({
      ...x,
      _id: undefined,
      __v: undefined,
      _parent: undefined,
      _deleted: undefined,
    }))
  }
  public async _insert(participant_id: string, objects: SensorEvent[]): Promise<{}> {
    const data: any[] = []
    //save activity event
    for (const object of objects) {
      await data.push({
        ...object,
        _parent: participant_id,
        timestamp: Number.parse(object.timestamp),
        sensor: String(object.sensor),
        data: object.data ?? {},
      })
    }
    try {
       await MongoClientDB.collection("sensor_event").insertMany(data)
    } catch (error) {
      console.error(error)
    }

    return {}
  }
}
