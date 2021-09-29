import { Database } from "../Bootstrap"
import { ActivitySpec } from "../../model/ActivitySpec"
import { ActivitySpecInterface } from "../interface/RepositoryInterface"

export class ActivitySpecRepository implements ActivitySpecInterface {
  public async _select(id?: string): Promise<ActivitySpec[]> {
    const data = await Database.use("activity_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
    }))
  }
  public async _insert(object: ActivitySpec): Promise<{}> {
    try {
      await Database.use("activity_spec").insert({
        _id: object.name,
        help_contents: object.help_contents ?? null,
        script_contents: object.script_contents ?? null,
        static_data_schema: object.static_data_schema ?? {},
        temporal_slice_schema: object.temporal_slice_schema ?? {},
        settings_schema: object.settings_schema ?? {},
      } as any)
      return {}
    } catch (error) {
      throw new Error("500.activityspec-creation-failed")
    }
  }
  public async _update(id: string, object: ActivitySpec): Promise<{}> {
    const orig: any = await Database.use("activity_spec").get(id)
    await Database.use("activity_spec").bulk({
      docs: [
        {
          ...orig,
          help_contents: object.help_contents ?? orig.help_contents,
          script_contents: object.script_contents ?? orig.script_contents,
          static_data_schema: object.static_data_schema ?? orig.static_data_schema,
          temporal_slice_schema: object.temporal_slice_schema ?? orig.temporal_slice_schema,
          settings_schema: object.settings_schema ?? orig.settings_schema,
        },
      ],
    })
    return {}
  }
  public async _delete(id: string): Promise<{}> {
    const orig: any = await Database.use("activity_spec").get(id)
    await Database.use("activity_spec").bulk({ docs: [{ ...orig, _deleted: true }] })
    return {}
  }
}
