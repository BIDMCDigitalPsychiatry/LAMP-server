import { Database } from "../app"
import { ActivityEvent } from "../model/ActivityEvent"
import CryptoJS from "crypto-js"
// FIXME: does not support filtering by ActivitySpec yet.

export class ActivityEventRepository {
  public static async _select(
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
    ).docs.map((x) => ({
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
    })) as any

    // if the data is encrypted in db
    if ("on" === process.env.Activity_Event_Encryption) {
      for (let index = 0; index < all_res.length; index++) {
        try {
          const bytesStaticData = CryptoJS.AES.decrypt(all_res[index].static_data, `${process.env.ENC_KEY}`)
          const decryptedStaticData = JSON.parse(bytesStaticData.toString(CryptoJS.enc.Utf8))
          const bytesTemporalSlices = CryptoJS.AES.decrypt(all_res[index].temporal_slices, `${process.env.ENC_KEY}`)
          const decryptedTemporalSlices = JSON.parse(bytesTemporalSlices.toString(CryptoJS.enc.Utf8))
          all_res[index].static_data = decryptedStaticData
          all_res[index].temporal_slices = decryptedTemporalSlices
        } catch (error) {}
      }
    }
    return all_res
  }
  /** encrypt and insering data
   * 
   * @param participant_id 
   * @param objects 
   */
  public static async _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}> {
    const data = await Database.use("activity_event").bulk({
      docs: objects.map((x) => ({
        "#parent": participant_id,
        timestamp: Number.parse(x.timestamp) ?? 0,
        duration: Number.parse(x.duration) ?? 0,
        activity: String(x.activity),
        static_data:
          (process.env.Activity_Event_Encryption === "on"
            ? CryptoJS.AES.encrypt(JSON.stringify(x.static_data), `${process.env.ENC_KEY}`).toString()
            : x.static_data) ?? {},
        temporal_slices:
          (process.env.Activity_Event_Encryption === "on"
            ? CryptoJS.AES.encrypt(JSON.stringify(x.temporal_slices), `${process.env.ENC_KEY}`).toString()
            : x.temporal_slices) ?? [],
      })),
    })
    const output = data.filter((x) => !!x.error)
    if (output.length > 0) console.error(output)
    return {}
  }
}
