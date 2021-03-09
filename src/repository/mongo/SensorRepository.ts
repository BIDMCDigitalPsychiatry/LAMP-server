import { uuid } from "../Bootstrap"
import { Sensor } from "../../model/Sensor"
import { SensorModel } from "../../model/Sensor"
import { SensorInterface } from "../interface/RepositoryInterface"

export class SensorRepository implements SensorInterface {
  public async _select(id: string | null, parent = false,ignore_binary=false): Promise<Sensor[]> {
    const data = await SensorModel.find(!!id ? (parent ? { _parent: id } : { _id: id }) : {})
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      ...x._doc,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      timestamp: undefined,
      settings:ignore_binary?undefined:x._doc.settings
    }))
  }
  public async _insert(study_id: string, object: any /*Sensor*/): Promise<string> {
    const _id = uuid()
    //save Sensor via Sensor model
    await new SensorModel({
      _id: _id,
      _parent: study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
    } as any).save()

    return _id
  }

  public async _update(sensor_id: string, object: any /*Sensor*/): Promise<{}> {
    const orig: any = await SensorModel.findById(sensor_id)
    await SensorModel.findByIdAndUpdate(sensor_id, {
      name: object.name ?? orig.name,
      settings: object.settings ?? orig.settings,
    })

    return {}
  }

  public async _delete(sensor_id: string): Promise<{}> {
    try {
      await SensorModel.deleteOne({ _id: sensor_id })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
