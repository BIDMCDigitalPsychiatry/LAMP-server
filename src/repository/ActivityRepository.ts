import { Database, uuid } from "./Bootstrap"
import { Activity } from "../model/Activity"
import { ActivityModel } from "../model/Activity"

export class ActivityRepository {
  public static async _select(id: string | null, parent = false): Promise<Activity[]> {
    //get data from  Activity via  Activity model
    if (process.env.DB_DRIVER === "couchdb") {
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
    } else {
      const data = await ActivityModel.find(!!id ? (parent ? { "#parent": id } : { _id: id }) : {})
        .sort({ timestamp: 1 })
        .limit(2_147_483_647)
      return (data as any).map((x: any) => ({
        id: x._doc._id,
        ...x._doc,
        _id: undefined,
        "#parent": undefined,
        __v: undefined,
        timestamp: undefined,
      }))
    }
  }
  public static async _insert(study_id: string, object: Activity): Promise<string> {
    const _id = uuid()
    //save Activity via Activity model
    if (process.env.DB_DRIVER === "couchdb") {
        await Database.use("activity").insert({
          _id: _id,
          "#parent": study_id,
          timestamp: new Date().getTime(),
          spec: object.spec ?? "__broken_link__",
          name: object.name ?? "",
          settings: object.settings ?? {},
          schedule: object.schedule ?? [],
        } as any)
    } else { 
        await new ActivityModel({
          _id: _id,
          "#parent": study_id,
          timestamp: new Date().getTime(),
          spec: object.spec ?? "__broken_link__",
          name: object.name ?? "",
          settings: object.settings ?? {},
          schedule: object.schedule ?? [],
        } as any).save()
      }

    return _id
  }
  public static async _update(activity_id: string, object: Activity): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
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
    } else {
      const orig: any = await ActivityModel.findById(activity_id)
      await ActivityModel.findByIdAndUpdate(activity_id, {
        name: object.name ?? orig.name,
        settings: object.settings ?? orig.settings,
        schedule: object.schedule ?? orig.schedule,
      })
    }

    return {}
  }
  public static async _delete(activity_id: string): Promise<{}> {
    try {
      if (process.env.DB_DRIVER === "couchdb") {
        const orig = await Database.use("activity").get(activity_id)
        const data = await Database.use("activity").bulk({
          docs: [{ ...orig, _deleted: true }],
        })
        if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
      } else {      
        await ActivityModel.deleteOne({ _id: activity_id })
      }
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
