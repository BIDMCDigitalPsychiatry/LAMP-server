import { Database } from "../../app"
import { Study } from "../../model/Study"
import { Researcher } from "../../model/Researcher"
import { ActivityEvent } from "../../model/ActivityEvent"
import { ResearcherRepository } from "../pouchRepository/ResearcherRepository"
import { StudyRepository } from "../pouchRepository/StudyRepository"
import { ParticipantRepository } from "../pouchRepository/ParticipantRepository"
import { Identifier_unpack } from "../pouchRepository/TypeRepository"
import { _migrate_activity_event, _migrator_lookup_table, _migrator_export_table } from "./migrate"
import { customAlphabet } from "nanoid"
const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20) // crockford-32
const PouchDB = require('pouchdb')

// FIXME: does not support filtering by ActivitySpec yet.

export class ActivityEventPouchRepository {
  /**
   * Get a set of `ActivityEvent`s matching the criteria parameters.
   */
  public static async _select(
    /**
     *
     */
    id?: string,

    /**
     *
     */
    activity_id_or_spec?: string,

    /**
     *
     */
    from_date?: number,

    /**
     *
     */
    to_date?: number,

    limit?: number
  ): Promise<ActivityEvent[]> {
    _migrate_activity_event()

    //Is it required, as we are in local server?
    // const _lookup_table = await _migrator_export_table() 

    // Get the correctly scoped identifier to search within.
    let user_id: string | undefined
    let admin_id: number | undefined
    if (!!id && Identifier_unpack(id)[0] === (<any>Researcher).name)
      admin_id = ResearcherRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id)[0] === (<any>Study).name) admin_id = StudyRepository._unpack_id(id).admin_id
    else if (!!id && Identifier_unpack(id).length === 0 /* Participant */)
      user_id = ParticipantRepository._unpack_id(id).study_id
    else if (!!id) throw new Error("400.invalid-identifier")
    //user_id = !!user_id ? Encrypt(user_id) : undefined
    PouchDB.plugin(require('pouchdb-find'));
    const db = new PouchDB('activity_event');
    const all_res = (await db.find({
      selector: {

        timestamp:
          from_date === undefined && to_date === undefined ? (undefined as any) :
            {
              $gte: from_date,
              $lt: from_date === to_date ? to_date! + 1 : to_date,
            },

        activity:
          activity_id_or_spec === undefined ? (undefined as any) :
            { $eq: activity_id_or_spec }

      },
      fields: ['_id', '_rev', 'timestamp', 'duration', '#parent', 'activity', 'static_data', 'temporal_slices', 'activity'],
      sort: [
        {
          timestamp: !!limit && limit < 0 ? "asc" : "desc",
        },
      ],
      limit: Math.abs(limit ?? 1000)
    })).docs.map((x: any) => ({
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
      // activity: _lookup_table[(x as any).activity],
    })) as any
    return all_res

    // Perform a group-by operation on the participant ID if needed.
    /*return !admin_id
      ? all_res
      : all_res.reduce((prev, curr: any) => {
          const key = (<any>curr).parent
          ;(prev[key] ? prev[key] : (prev[key] = null || [])).push({ ...curr, parent: undefined })
          return prev
        }, <any>{})
    */
  }

  /**
   * Add a new `ActivityEvent` with new fields.
   */
  public static async _insert(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     * The new object to append.
     */
    objects: ActivityEvent[]
  ): Promise<{}> {
    //_migrate_activity_event()
    const _lookup_table = await _migrator_lookup_table() // FIXME
    const _lookup_migrator_id = (legacyID: string): string => {
      let match = _lookup_table[legacyID]
      if (match === undefined) {
        match = uuid() // 20-char id for non-Participant objects
        _lookup_table[legacyID] = match
        console.log(`inserting migrator link: ${legacyID} => ${match}`)
        Database.use("root").insert({ _id: `_local/${legacyID}`, value: match } as any)
      }
      return match
    }

    const data = await Database.use("activity_event").bulk({
      docs: objects.map((x) => ({
        "#parent": participant_id,
        timestamp: Number.parse(x.timestamp) ?? 0,
        duration: Number.parse(x.duration) ?? 0,
        activity: _lookup_migrator_id(String(x.activity)),
        static_data: x.static_data ?? {},
        temporal_slices: x.temporal_slices ?? [],
      })),
    })
    const output = data.filter((x) => !!x.error)
    if (output.length > 0) console.error(output)
    return {}
  }

  /**
   * Deletes a `ActivityEvent` row.
   */
  public static async _delete(
    /**
     * The `StudyId` column of the `Users` table in the LAMP v0.1 DB.
     */
    participant_id: string,

    /**
     *
     */
    activity_id_or_spec?: string,

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
