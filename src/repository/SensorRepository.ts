import { Database, uuid } from "./Bootstrap"
import { Sensor } from "../model/Sensor"
import { SensorModel } from "../model/Sensor"

export class SensorRepository {
  public static async _select(id: string | null, parent = false): Promise<Sensor[]> {
    if (process.env.DB_DRIVER === "couchdb") {
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
        timestamp: undefined,
      }))
    } else {
      const data = await SensorModel.find(!!id ? (parent ? { "#parent": id } : { _id: id }) : {})
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
  public static async _insert(study_id: string, object: any /*Sensor*/): Promise<string> {
    const _id = uuid()

    //save Sensor via Sensor model
    if (process.env.DB_DRIVER === "couchdb") {
       await Database.use("sensor").insert({
          _id: _id,
          "#parent": study_id,
          timestamp: new Date().getTime(),
          spec: object.spec ?? "__broken_link__",
          name: object.name ?? "",
          settings: object.settings ?? {},
        } as any)
      } else { await new SensorModel({
          _id: _id,
          "#parent": study_id,
          timestamp: new Date().getTime(),
          spec: object.spec ?? "__broken_link__",
          name: object.name ?? "",
          settings: object.settings ?? {},
        } as any).save()
      }
    return _id
  }
  public static async _update(sensor_id: string, object: any /*Sensor*/): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
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
    } else {
      const orig: any = await SensorModel.findById(sensor_id)
      await SensorModel.findByIdAndUpdate(sensor_id, {
        name: object.name ?? orig.name,
        settings: object.settings ?? orig.settings,
      })
    }
    return {}
  }
  public static async _delete(sensor_id: string): Promise<{}> {
    try {
      if (process.env.DB_DRIVER === "couchdb") {
        const orig = await Database.use("sensor").get(sensor_id)
        const data = await Database.use("sensor").bulk({
          docs: [{ ...orig, _deleted: true }],
        })
        if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
      } else {       
        await SensorModel.deleteOne({ _id: sensor_id })
      }
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
