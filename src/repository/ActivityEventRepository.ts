import { Database } from "./Bootstrap"
import { ActivityEvent } from "../model/ActivityEvent"
import { ActivityEventModel } from "../model/ActivityEvent"
// FIXME: does not support filtering by ActivitySpec yet.

export class ActivityEventRepository {
  public static async _select(
    id?: string,
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]> {
    if (process.env.DB_DRIVER === "couchdb") {
      const all_res = (
        await Database.use("activity_event").find({
          selector: {
            "#parent": id!,
            activity: activity_id_or_spec!,
            timestamp:
              from_date === undefined && to_date === undefined
                ? (undefined as any)
                : {
                    $gte: from_date,
                    $lt: from_date === to_date ? to_date! + 1 : to_date,
                  },
          },
          sort: [
            {
              timestamp: !!limit && limit < 0 ? "asc" : "desc",
            },
          ],
          limit: Math.abs(limit ?? 1),
        })
      ).docs.map((x: any) => ({
        ...x,
        _id: undefined,
        _rev: undefined,
        "#parent": undefined,
      })) as any
      return all_res
    } else {
      // preparing filter params
      let filteredQuery: any = {}
      if (!!id) {
        filteredQuery["#parent"] = id
      }
      if (!!activity_id_or_spec) {
        filteredQuery.activity = activity_id_or_spec
      }
      if (!!from_date) {
        filteredQuery.timestamp = { $gte: from_date }
      }
      if (!!to_date) {
        filteredQuery.timestamp = { $lte: to_date }
      }
      const all_res = await ActivityEventModel.find(filteredQuery)
        .sort({ timestamp: !!limit && limit < 0 ? 1 : -1 })
        .limit(limit ?? 1)
      return (all_res as any).map((x: any) => ({
        ...x._doc,
        _id: undefined,
        __v: undefined,
        "#parent": undefined,
      }))
    }
  }
  public static async _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
      const data = await Database.use("activity_event").bulk({
        docs: objects.map((x) => ({
          "#parent": participant_id,
          timestamp: Number.parse(x.timestamp) ?? 0,
          duration: Number.parse(x.duration) ?? 0,
          activity: String(x.activity),
          static_data: x.static_data ?? {},
          temporal_slices: x.temporal_slices ?? [],
        })),
      })
      const output = data.filter((x: any) => !!x.error)
      if (output.length > 0) console.error(output)
    } else {
      const data: any[] = []
      //save activity event
      for (const object of objects) {
        await data.push({
          ...object,
          "#parent": participant_id,
          timestamp: Number.parse(object.timestamp) ?? 0,
          duration: Number.parse(object.duration) ?? 0,
          activity: String(object.activity),
          static_data: object.static_data ?? {},
          temporal_slices: object.temporal_slices ?? [],
        })
      }
      try {
        await ActivityEventModel.insertMany(data)
      } catch (error) {
        console.error(error)
      }
    }
    return {}
  }
}
