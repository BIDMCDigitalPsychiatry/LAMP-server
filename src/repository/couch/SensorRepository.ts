import { Database, uuid } from "../Bootstrap"
import { Sensor } from "../../model/Sensor"
import { SensorInterface } from "../interface/RepositoryInterface"

export class SensorRepository implements SensorInterface {
  public async _select(id: string | null, parent = false, ignore_binary = false): Promise<Sensor[]> {
    return (
      await Database.use("sensor").find({
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
      settings: ignore_binary ? undefined : x.settings,
    }))
  }
  public async _insert(study_id: string, object: any /*Sensor*/): Promise<string> {
    const _id = uuid()
    await Database.use("sensor").insert({
      _id: _id,
      "#parent": study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
    } as any)
    return _id
  }
  public async _update(sensor_id: string, object: any /*Sensor*/): Promise<{}> {
    const orig: any = await Database.use("sensor").get(sensor_id)
    await Database.use("sensor").bulk({
      docs: [
        {
          ...orig,
          name: object.name ?? orig.name,
          spec: object.spec ?? orig.spec,
          settings: object.settings ?? orig.settings,
        },
      ],
    })
    return {}
  }
  public async _delete(sensor_id: string): Promise<{}> {
    try {
      const orig = await Database.use("sensor").get(sensor_id)
      const data = await Database.use("sensor").bulk({
        docs: [{ ...orig, _deleted: true }],
      })
      if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  /** There would be a need for pagination of the data without settings. So, its seperately written
   *
   * @param  string id
   * @param boolean parent
   * @returns Array Sensor[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Sensor[]> {
    return (
      await Database.use("sensor").find({
        selector: { "#parent": id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _rev: undefined,
      settings: undefined,
      "#parent": undefined,
      study_id: x["#parent"],
      timestamp: undefined,
    }))
  }
}
