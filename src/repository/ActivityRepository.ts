import { Database, uuid } from "../app"
import { Activity } from "../model/Activity"

export class ActivityRepository {
  public static async _select(id: string | null, parent: boolean = false): Promise<Activity[]> {
    return (
      await Database.use("activity").find({
        selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
      timestamp: undefined,
    }))
  }
  public static async _insert(study_id: string, object: Activity): Promise<string> {
    const _id = uuid()
    await Database.use("activity").insert({
      _id: _id,
      "#parent": study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      schedule: object.schedule ?? [],
    } as any)
    return _id
  }
  public static async _update(activity_id: string, object: Activity): Promise<{}> {
    const orig: any = await Database.use("activity").get(activity_id)
    await Database.use("activity").bulk({
      docs: [
        {
          ...orig,
          name: object.name ?? orig.name,
          settings: object.settings ?? orig.settings,
          schedule: object.schedule ?? orig.schedule,
        },
      ],
    })
    return {}
  }
  public static async _delete(activity_id: string): Promise<{}> {
    try {
      const orig = await Database.use("activity").get(activity_id)
      const data = await Database.use("activity").bulk({
        docs: [{ ...orig, _deleted: true }],
      })
      if (data.filter((x) => !!x.error).length > 0) throw new Error()
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
