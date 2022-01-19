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
        help_contents: object.help_contents ?? null,
        script_contents: object.script_contents ?? null,
        static_data_schema: object.static_data_schema ?? {},
        temporal_slice_schema: object.temporal_slice_schema ?? {},
        settings_schema: object.settings_schema ?? {},
        category: object.category ?? null,
        executable: object.executable ?? null,
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
          help_contents: object.help_contents ?? orig.help_contents,
          script_contents: object.script_contents ?? orig.script_contents,          
          static_data_schema: object.static_data_schema ?? orig.static_data_schema,
          temporal_slice_schema: object.temporal_slice_schema ?? orig.temporal_slice_schema,
          settings_schema: object.settings_schema ?? orig.settings_schema,
          category: object.category ?? orig.category,
          executable: object.executable ?? orig.executable
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
