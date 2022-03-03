import { ActivitySpec } from "../../model/ActivitySpec"
import { ActivitySpecInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ActivitySpecRepository implements ActivitySpecInterface {
  public async _select(id?: string): Promise<ActivitySpec[]> {
    const parents = []    
    const data = !!id
      ? await MongoClientDB.collection("activity_spec").find({$or: [ { _deleted: false, _id: id }, { _deleted: undefined, _id: id } ]}).maxTimeMS(60000).toArray()
      : await MongoClientDB.collection("activity_spec").find({$or: [ { _deleted: false }, { _deleted: undefined } ]}).maxTimeMS(60000).toArray()
    return (data as any).map((x: any) => ({
      id: x._id,       
      ...x,
      _id: undefined,
      __v: undefined,
      executable: !!id ? x.executable : undefined,
      _deleted: undefined,
    }))
  }
  public async _insert(object: ActivitySpec): Promise<{}> {
    //save ActivitySpec via ActivitySpec model
    try {
      await MongoClientDB.collection("activity_spec").insertOne({
        _id: object.name,
        description: object.description ?? null,
        executable: object.executable ?? null,
        static_data: object.static_data ?? {},
        temporal_slices: object.temporal_slices ?? {},
        settings: object.settings ?? {},
        category: object.category ?? null,
        _deleted: false,
      } as any)
      return {}
    } catch (error) {
      throw new Error("500.activityspec-creation-failed")
    }
  }
  public async _update(id: string, object: ActivitySpec): Promise<{}> {
    const orig: any = await MongoClientDB.collection("activity_spec").findOne({ _id: id })
    await MongoClientDB.collection("activity_spec").findOneAndUpdate(
      { _id: orig._id },
      {
        $set: {
          description: object.description ?? orig.description,
          executable: object.executable ?? orig.executable,          
          static_data: object.static_data ?? orig.static_data,
          temporal_slices: object.temporal_slices ?? orig.temporal_slices,
          settings: object.settings ?? orig.settings,
          category: object.category ?? orig.category,
        },
      }
    )
    return {}
  }
  public async _delete(id: string): Promise<{}> {
    try {
      await MongoClientDB.collection("activity_spec").updateOne({ _id: id }, { $set: { _deleted: true } })
    } catch (e) {
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
