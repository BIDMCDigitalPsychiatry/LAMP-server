import { Database } from "../Bootstrap"
import { SensorSpec } from "../../model/SensorSpec"
import { SensorSpecInterface } from "../interface/RepositoryInterface"

export class SensorSpecRepository implements SensorSpecInterface {
  public async _select(id?: string): Promise<SensorSpec[]> {
    const data = await Database.use("sensor_spec").list({ include_docs: true, start_key: id, end_key: id })
    return (data.rows as any).map((x: any) => ({
      id: x.doc._id,
      ...x.doc,
      _id: undefined,
      _rev: undefined,
    }))
  }
  public async _insert(object: SensorSpec): Promise<{}> {
    try {
      await Database.use("sensor_spec").insert({
        _id: object.name,
        settings_schema: object.settings_schema ?? {}
      } as any)
      return {}
    } catch (error) {
      throw new Error("500.sensorspec-creation-failed")
    }
  }
  public async _update(id: string, object: SensorSpec): Promise<{}> {
    const orig: any = await Database.use("sensor_spec").get(id)
    await Database.use("sensor_spec").bulk({
      docs: [
        {
          ...orig,
          settings_schema: object.settings_schema ?? orig.settings_schema
        },
      ],
    })
    return {}
  }
  public async _delete(id: string): Promise<{}> {
    const orig: any = await Database.use("sensor_spec").get(id)
    await Database.use("sensor_spec").bulk({ docs: [{ ...orig, _deleted: true }] })
    return {}
  }
}
