import { Database } from "../Bootstrap"
import { ActivityEvent } from "../../model/ActivityEvent"
// FIXME: does not support filtering by ActivitySpec yet.
import { ActivityEventInterface } from "../interface/RepositoryInterface"

export class ActivityEventRepository implements ActivityEventInterface {
  public async _select(
    id?: string,
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]> {
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
    ).docs.map((x: any) => {
      delete x._id, x._rev, x["#parent"]

      // Embedded binary audio data is excluded for performance reasons
      if (/^data:audio.+/.test(x.static_data?.url))
        delete x.static_data?.url

      return x
    }) as any
    return all_res
  }
  public async _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}> {
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
    return {}
  }
}
