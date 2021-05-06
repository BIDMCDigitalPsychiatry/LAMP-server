import { uuid } from "../Bootstrap"
import { Activity } from "../../model/Activity"
import { ActivityInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ActivityRepository implements ActivityInterface {
  public async _select(id: string | null, parent = false, ignore_binary = false): Promise<Activity[]> {
    //aggregate will give faster results (particulary when projection in query is applied, 2sec -find, 0.5 sec-aggregate)
    const data = await MongoClientDB.collection("activity")
      .aggregate([
        parent
          ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
          : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
        ignore_binary
          ? { $project: { name: 1, spec: 1, schedule: 1, _parent: 1 } }
          : { $project: { name: 1, spec: 1, schedule: 1, _parent: 1, settings: 1 } },
        { $sort: { timestamp: 1 } },
        { $limit: 2_147_483_647 },
      ])
      .maxTimeMS(120000)
      .toArray()

    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      _deleted: undefined,
      settings: ignore_binary ? undefined : x.settings,
      timestamp: undefined,
    }))
  }
  public async _insert(study_id: string, object: Activity): Promise<string> {
    const _id = uuid()
    //save Activity via Activity model
    await MongoClientDB.collection("activity").insertOne({
      _id: _id,
      _parent: study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      schedule: object.schedule ?? [],
      _deleted: false,
    } as any)

    return _id
  }
  public async _update(activity_id: string, object: Activity): Promise<{}> {
    const orig: any = await MongoClientDB.collection("activity").findOne({ _id: activity_id })
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
    await MongoClientDB.collection("activity").findOneAndUpdate(
      { _id: activity_id },
      {
        $set: {
          name: object.name ?? orig.name,
          settings: object.settings ?? orig.settings,
          schedule: (newSchedules.length !== 0 ? newSchedules : object.schedule) ?? orig.schedule,
        },
      }
    )
    return {}
  }
  public async _delete(activity_id: string): Promise<{}> {
    try {
      await MongoClientDB.collection("activity").updateOne({ _id: activity_id }, { $set: { _deleted: true } })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  /** get activities with settings excluded
   *
   * @param id
   * @param parent
   * @returns Array Activity[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Activity[]> {
    const data = await MongoClientDB.collection("activity")
      .aggregate([
        parent
          ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
          : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
        { $project: { name: 1, spec: 1, schedule: 1, _parent: 1 } },
        { $sort: { timestamp: 1 } },
        { $limit: 2_147_483_647 },
      ])
      .maxTimeMS(120000)
      .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      settings: undefined,
      _deleted: undefined,
      study_id: x._parent,
      __v: undefined,
      timestamp: undefined,
    }))
  }
}
