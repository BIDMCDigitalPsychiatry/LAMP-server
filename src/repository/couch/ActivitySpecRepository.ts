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
      executable: !!id ? x.doc.executable : undefined,
      _rev: undefined,
    }))
  }
  public async _insert(object: ActivitySpec): Promise<{}> {
    try {
      await Database.use("activity_spec").insert({
        _id: object.name,
        description: object.description ?? null,
        executable: object.executable ?? null,
        static_data: object.static_data ?? {},
        temporal_slices: object.temporal_slices ?? {},
        settings: object.settings ?? {},
        category: object.category ?? null,
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
          description: object.description ?? orig.description,
          executable: object.executable ?? orig.executable,
          static_data: object.static_data ?? orig.static_data,
          temporal_slices: object.temporal_slices ?? orig.temporal_slices,
          settings: object.settings ?? orig.settings,
          category: object.category ?? orig.category,
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
