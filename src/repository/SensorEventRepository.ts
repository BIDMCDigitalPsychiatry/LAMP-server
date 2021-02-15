import { Database } from "./Bootstrap"
import { SensorEvent } from "../model/SensorEvent"
import { SensorEventModel } from "../model/SensorEvent"
// FIXME: does not support filtering by Sensor yet.

export class SensorEventRepository {
  public static async _select(
    id?: string,
    sensor_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<SensorEvent[]> {
    if (process.env.DB_DRIVER === "couchdb") {
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
      ).docs.map((x: any) => ({
        ...x,
        _id: undefined,
        _rev: undefined,
        "#parent": undefined,
      })) as any
      return all_res
    } else {
      let filteredQuery: any = {}
      if (!!id) {
        filteredQuery["#parent"] = id
      }
      if (!!sensor_spec) {
        filteredQuery.sensor = sensor_spec
      }
      if (!!from_date) {
        filteredQuery.timestamp = { $gte: from_date }
      }
      if (!!to_date) {
        filteredQuery.timestamp = { $lte: to_date }
      }
      const all_res = await SensorEventModel.find(filteredQuery)
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
  public static async _insert(participant_id: string, objects: SensorEvent[]): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
      const data = await Database.use("sensor_event").bulk({
        docs: (objects as any[]).map((x) => ({
          "#parent": participant_id,
          timestamp: Number.parse(x.timestamp),
          sensor: String(x.sensor),
          data: x.data ?? {},
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
          timestamp: Number.parse(object.timestamp),
          sensor: String(object.sensor),
          data: object.data ?? {},
        })
      }

      try {
        await SensorEventModel.insertMany(data)
      } catch (error) {
        console.error(error)
      }
    }
    return {}
  }
}
