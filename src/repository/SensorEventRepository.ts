import { Database } from "../app"
import { SensorEvent } from "../model/SensorEvent"
// FIXME: does not support filtering by Sensor yet.

export class SensorEventRepository {
  public static async _select(
    id?: string,
    sensor_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<SensorEvent[]> {
    const all_res = (
      await Database.use("sensor_event").find({
        selector: {
          "#parent": id!,
          sensor: sensor_spec!,
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
    ).docs.map((x) => ({
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
    })) as any
    return all_res
  }
  public static async _insert(participant_id: string, objects: SensorEvent[]): Promise<{}> {
    const data = await Database.use("sensor_event").bulk({
      docs: (objects as any[]).map((x) => ({
        "#parent": participant_id,
        timestamp: Number.parse(x.timestamp),
        sensor: String(x.sensor),
        data: x.data ?? {},
      })),
    })
    const output = data.filter((x) => !!x.error)
    if (output.length > 0) console.error(output)
    return {}
  }
}
