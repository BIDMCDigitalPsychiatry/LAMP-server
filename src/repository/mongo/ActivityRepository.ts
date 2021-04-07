import { uuid } from "../Bootstrap"
import { Activity } from "../../model/Activity"
import { ActivityModel } from "../../model/Activity"
import { ActivityInterface } from "../interface/RepositoryInterface"

export class ActivityRepository implements ActivityInterface {
  public async _select(id: string | null, parent = false, ignore_binary = false): Promise<Activity[]> {
    //get data from  Activity via  Activity model
    const data = await ActivityModel.find(
      !!id ? (parent ? { _parent: id, _deleted: false } : { _id: id, _deleted: false }) : { _deleted: false }
    )
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      ...x._doc,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      _deleted: undefined,
      settings: ignore_binary ? undefined : x._doc.settings,
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
    const schedules: any = object.schedule ?? undefined
    let newSchedules: object[] = []

    if (!!schedules) {
      //find notification id for schedules
      for (let schedule of schedules) {
        //if not custom, single notification id would be there
        if (schedule.repeat_interval !== "custom") {
          const notificationId: number = Math.floor(Math.random() * 1000000) + 1
          schedule = { ...schedule, notification_ids: [notificationId] }
          await newSchedules.push(schedule)
        } else {
          //if  custom, multiple notification ids would be there
          if (!!schedule.custom_time) {
            let custNotids: number[] = []
            //find notification id for multiple custom times
            for (const customTimes of schedule.custom_time) {
              const notificationId: number = Math.floor(Math.random() * 1000000) + 1
              custNotids.push(notificationId)
            }
            schedule = { ...schedule, notification_ids: custNotids }
            await newSchedules.push(schedule)
          }
        }
      }
    }
    await ActivityModel.findByIdAndUpdate(activity_id, {
      name: object.name ?? orig.name,
      settings: object.settings ?? orig.settings,
      schedule: (newSchedules.length !== 0 ? newSchedules : object.schedule) ?? orig.schedule,
    })
    return {}
  }

  public async _delete(activity_id: string): Promise<{}> {
    try {
      await ActivityModel.updateOne({ _id: activity_id }, { _deleted: true })
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
    const data = await ActivityModel.find({ _parent: id, _deleted: false }).sort({ timestamp: 1 }).limit(2_147_483_647)
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
