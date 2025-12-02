import { Database, uuid } from "../Bootstrap"
import { Activity } from "../../model/Activity"
import { ActivityInterface } from "../interface/RepositoryInterface"

export class ActivityRepository implements ActivityInterface {
  public async _select(
    study_id: string | null,

    parent = false,
    ignore_binary = false
  ): Promise<Activity[]> {
    return (
      await Database.use("activity").find({
        selector: study_id === null ? {} : { [parent ? "#parent" : "_id"]: study_id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
      settings: ignore_binary ? undefined : x.settings,
      timestamp: undefined,
    }))
  }
  public async _list(
    id?: string,
    tab?: string,
    limit?: number,
    offset?: number
  ): Promise<{ data: any; total: number }> {
    return {
      data: {
        otherActivities: [],
      },
      total: 0,
    }
  }
  public async _insert(study_id: string, object: Activity): Promise<string> {
    const _id = uuid()
    await Database.use("activity").insert({
      _id: _id,
      "#parent": study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      schedule: object.schedule ?? [],
      category: object.category ?? null,
    } as any)
    return _id
  }
  public async _update(activity_id: string, object: Activity): Promise<{}> {
    const orig: any = await Database.use("activity").get(activity_id)
    const schedules: any = object.schedule ?? undefined
    const newSchedules: object[] = []
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
            const custNotids: number[] = []
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
    await Database.use("activity").bulk({
      docs: [
        {
          ...orig,
          name: object.name ?? orig.name,
          settings: object.settings ?? orig.settings,
          category: object.category ?? orig.category,
          schedule: (newSchedules.length !== 0 ? newSchedules : object.schedule) ?? orig.schedule,
        },
      ],
    })
    return {}
  }
  public async _delete(activity_id: string): Promise<{}> {
    try {
      const orig = await Database.use("activity").get(activity_id)
      const data = await Database.use("activity").bulk({
        docs: [{ ...orig, _deleted: true }],
      })
      if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  public async _deleteActivities(activities: string[]): Promise<{}> {
    return {}
  }

  /** get activities.There would be a need for pagination of the data without settings. So, its seperately written
   *
   * @param id
   * @param parent
   * @returns Array Activity[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Activity[]> {
    return (
      await Database.use("activity").find({
        selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
        sort: [{ timestamp: "asc" }],
        fields: ["_id", "name", "spec", "schedule", "#parent", "category"],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
      settings: undefined,
      study_id: x["#parent"],
      timestamp: undefined,
    }))
  }
  public async _listModule(
    module_id: string | null,
    participant_id: string | null,
    depth?: any,
    maxDepth?: any
  ): Promise<any[]> {
    return []
  }

  public async _getFeedDetails(participantId: string, dateMs: string, tzOffsetMinutes?: number): Promise<any> {
    // Not implemented for CouchDB driver; return empty object to satisfy interface
    return { items: [], distinctDays: [] }
  }
}
