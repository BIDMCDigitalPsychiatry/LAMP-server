import { ActivityEvent } from "../../model/ActivityEvent"
// FIXME: does not support filtering by ActivitySpec yet.
import { ActivityEventInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ActivityEventRepository implements ActivityEventInterface {
  public async _select(
    id?: string,
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]> {
    // preparing filter params
    let filteredQuery: any = {}
    if (!!id) {
      filteredQuery._parent = id
    }
    if (!!activity_id_or_spec) {
      filteredQuery.activity = activity_id_or_spec
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
    const all_res = await MongoClientDB.collection("activity_event")
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
  public async _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}> {
    const data: any[] = []
    //save activity event
    for (const object of objects) {
      await data.push({
        ...object,
        _parent: participant_id,
        timestamp: Number.parse(object.timestamp) ?? 0,
        duration: Number.parse(object.duration) ?? 0,
        activity: String(object.activity),
        static_data: object.static_data ?? {},
        temporal_slices: object.temporal_slices ?? [],
      })
    }
    try {
      await await MongoClientDB.collection("activity_event").insertMany(data)
    } catch (error) {
      console.error(error)
    }

    return {}
  }
}
