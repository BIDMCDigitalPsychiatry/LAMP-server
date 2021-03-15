import { uuid } from "../Bootstrap"
import { Activity } from "../../model/Activity"
import { ActivityModel } from "../../model/Activity"
import { ActivityInterface } from "../interface/RepositoryInterface"

export class ActivityRepository implements ActivityInterface {
  public async _select(id: string | null, parent = false): Promise<Activity[]> {
    //get data from  Activity via  Activity model
    const data = await ActivityModel.find(!!id ? (parent ? { _parent: id } : { _id: id }) : {})
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      ...x._doc,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      timestamp: undefined,
    }))
  }
  public async _insert(study_id: string, object: Activity): Promise<string> {
    const _id = uuid()
    //save Activity via Activity model
    await new ActivityModel({
      _id: _id,
      _parent: study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      schedule: object.schedule ?? [],
    } as any).save()

    return _id
  }

  public async _update(activity_id: string, object: Activity): Promise<{}> {
    const orig: any = await ActivityModel.findById(activity_id)
    await ActivityModel.findByIdAndUpdate(activity_id, {
      name: object.name ?? orig.name,
      settings: object.settings ?? orig.settings,
      schedule: object.schedule ?? orig.schedule,
    })
    return {}
  }

  public async _delete(activity_id: string): Promise<{}> {
    try {
      await ActivityModel.deleteOne({ _id: activity_id })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  /** get activities. There would be a need for pagination of the data without settings. So, its seperately written
   *
   * @param id
   * @param parent
   * @returns Array Activity[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Activity[]> {
    //get data from  Activity via  Activity model
    const data = await ActivityModel.find({ _parent: id, _deleted:false }).sort({ timestamp: 1 }).limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      ...x._doc,
      _id: undefined,
      _parent: undefined,
      settings: undefined,
      _deleted: undefined,
      study_id: x._doc._parent,
      __v: undefined,
      timestamp: undefined,
    }))
  }
}
