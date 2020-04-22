import { Database, SQL, Encrypt, Decrypt } from "../app"
import { IResult } from "mssql"
import { Participant } from "../model/Participant"
import { Study } from "../model/Study"
import { Researcher } from "../model/Researcher"
import { SensorEvent, SensorName, LocationContext, SocialContext } from "../model/SensorEvent"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { StudyRepository } from "../repository/StudyRepository"
import { ParticipantRepository } from "../repository/ParticipantRepository"
import { Identifier_unpack, Identifier_pack } from "../repository/TypeRepository"
import { _migrate_sensor_event } from "./migrate"

export class SensorEventRepository {
  /**
   * Get a set of `SensorEvent`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string,

    /**
     *
     */
    sensor_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number,

    limit?: number
  ): Promise<SensorEvent[]> {
    _migrate_sensor_event()

    // Get the correctly scoped identifier to search within.
    let user_id: string | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      user_id = ParticipantRepository._unpack_id(id).study_id
    else if (!!id) throw new Error("400.invalid-identifier")
    user_id = !!user_id ? Encrypt(user_id) : undefined

    return (
      await Database.use("sensor_event").find({
        selector: {
          "#parent": id!,
          sensor: sensor_spec!,
          timestamp:
            from_date === undefined && to_date === undefined
              ? (undefined as any)
              : {
                  $gte: from_date,
                  $lt: from_date === to_date ? to_date! + 1 : to_date
                }
        },
        sort: [
          {
            timestamp: !!limit && limit < 0 ? "asc" : "desc"
          }
        ],
        limit: Math.abs(limit ?? 1000)
      })
    ).docs.map(x => ({
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined
    })) as any

    let result1 = []
    return []
    let result2 = []

    let result3 = []

    let all_res = [...result1, ...result2, ...result3].sort((a, b) => <number>a.timestamp - <number>b.timestamp)

    // Perform a group-by operation on the participant ID if needed.
    return !admin_id
      ? all_res
      : all_res.reduce((prev, curr: any) => {
          let key = (<any>curr).parent
          ;(prev[key] ? prev[key] : (prev[key] = null || [])).push({
            ...curr,
            parent: undefined
          })
          return prev
        }, <any>{})
  }

  /**
   * Create a `SensorEvent` with a new object.
   */
  public static async _insert(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     * The new object.
     */
    objects: SensorEvent[]
  ): Promise<{}> {
    let data = await Database.use("sensor_event").bulk({
      docs: (objects as any[]).map(x => ({ "#parent": participant_id, ...x }))
    })
    console.error(data.filter(x => !!x.error))
    return { data: data.filter(x => !!x.error) }
  }

  /**
   * Delete a `SensorEvent` row.
   */
  public static async _delete(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     *
     */
    sensor_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number
  ): Promise<{}> {
    throw new Error("503.unimplemented")
    return {}
  }
}
