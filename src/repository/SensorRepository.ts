import { Database, uuid } from "../app"
import { Sensor } from "../model/Sensor"

export class SensorRepository {
  public static async _select(id: string | null, parent: boolean = false): Promise<Sensor[]> {
    return (
      await Database.use("sensor").find({
        selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
      "#parent": undefined,
    }))
  }
  public static async _insert(study_id: string, object: any /*Sensor*/): Promise<string> {
    const _id = uuid()
    await Database.use("activity").insert({
      _id: _id,
      "#parent": study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
    } as any)
    return _id
  }
  public static async _update(sensor_id: string, object: any /*Sensor*/): Promise<{}> {
    const orig: any = await Database.use("sensor").get(sensor_id)
    await Database.use("sensor").bulk({
      docs: [
        {
          ...orig,
          name: object.name ?? orig.name,
          settings: object.settings ?? orig.settings,
        },
      ],
    })
    return {}
  }
  public static async _delete(sensor_id: string): Promise<{}> {
    try {
      const orig = await Database.use("sensor").get(sensor_id)
      const data = await Database.use("sensor").bulk({
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
