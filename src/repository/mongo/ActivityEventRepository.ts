import { ActivityEvent } from "../../model/ActivityEvent"
// FIXME: does not support filtering by ActivitySpec yet.
import { ActivityEventInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ActivityEventRepository implements ActivityEventInterface {
  public async _select(
    id?: string,
    ignore_binary?: boolean,
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]> {
    // preparing filter params
    const filteredQuery: any = {}
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

    return (all_res as any).map((x: any) => {
      delete x._id, x.__v, x._parent, x._deleted

      // Embedded binary audio data is excluded for performance reasons
      if (!!ignore_binary) {
        if (/^data:audio.+/.test(x.static_data?.url)) delete x.static_data?.url
      }
      return x
    })
  }
  public async _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}> {
    let streak = 0
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
      await MongoClientDB.collection("activity_event").insertMany(data, { w: "majority" })
      const now = new Date()
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(now.getMonth() - 6)

      const activities = [...new Set(objects.map((o) => o.activity))]

      const events = await MongoClientDB.collection("activity_event")
        .find(
          {
            activity: { $in: activities },
            _parent: participant_id,
            timestamp: {
              $gte: sixMonthsAgo.getTime(),
            },
          },
          { readConcern: { level: "majority" } }
        )
        .toArray()

      const uniqueDates: string[] = Array.from(
        new Set(
          events.map((e: any) => {
            const d = new Date(e.timestamp)
            const y = d.getUTCFullYear()
            const m = d.getUTCMonth() + 1
            const day = d.getUTCDate()
            return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          })
        )
      )

      uniqueDates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())

      const currentDate = new Date()
      const compareDate = new Date(
        Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())
      )

      for (const date of uniqueDates) {
        const [y, m, d] = date.split("-").map(Number)
        const eventDate = new Date(Date.UTC(y, m - 1, d))

        if (eventDate.getTime() === compareDate.getTime()) {
          streak++
        } else {
          break
        }
        compareDate.setUTCDate(compareDate.getUTCDate() - 1)
      }

      return { streak: streak }
    } catch (error) {
      console.error(error)
    }
    return {}
  }
  public async _rank(participantIds: any, fromDate: any): Promise<any> {
    try {
      const ranking = await MongoClientDB.collection("activity_event")
        .aggregate([
          {
            $match: {
              _parent: { $in: participantIds },
              timestamp: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: "$_parent",
              completedCount: { $sum: 1 },
            },
          },
          {
            $sort: { completedCount: -1 },
          },
          {
            $project: {
              participantId: "$_id",
              completedCount: 1,
              _id: 0,
            },
          },
        ])
        .toArray()

      return ranking
    } catch (e: any) {}
  }
}
