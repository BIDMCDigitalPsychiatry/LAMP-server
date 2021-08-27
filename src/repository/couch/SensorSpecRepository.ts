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
        properties: object.properties ?? {},
        type: object.type ?? null,
        description: object.description ?? null,
        required: object.required ?? {},
        additionalProperties: object.additionalProperties ?? {},
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
          type: object.type ?? orig.type,
          description: object.description ?? orig.description,
          properties: object.properties ?? orig.properties,
          additionalProperties: object.additionalProperties ?? orig.additionalProperties,
          required: object.required ?? orig.required,
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
