import { Database, uuid } from "./Bootstrap"
import { Study } from "../model/Study"
import { StudyModel } from "../model/Study"

export class StudyRepository {
  public static async _select(id: string | null, parent = false): Promise<Study[]> {
    if (process.env.DB_DRIVER === "couchdb") {
      return (
        await Database.use("study").find({
          selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },

          sort: [{ timestamp: "asc" }],

          limit: 2_147_483_647 /* 32-bit INT_MAX */,
        })
      ).docs.map((doc: any) => ({
        id: doc._id,
        ...doc,
        _id: undefined,
        _rev: undefined,
        "#parent": undefined,
        timestamp: undefined,
      }))
    } else {
      //get data from study via study model
      const data = await StudyModel.find(!!id ? (parent ? { "#parent": id } : { _id: id }) : {})
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
  public static async _insert(researcher_id: string, object: Study): Promise<string> {
    const _id = uuid()
    //save data in CouchDb/Mongo
    if (process.env.DB_DRIVER === "couchdb") {
       await Database.use("study").insert({
          _id: _id,
          "#parent": researcher_id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any)
    } else { 
        await new StudyModel({
          _id: _id,
          "#parent": researcher_id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any).save()
      }
    return _id
  }
  public static async _update(study_id: string, object: Study): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
      const orig: any = await Database.use("study").get(study_id)
      await Database.use("study").bulk({ docs: [{ ...orig, name: object.name ?? orig.name }] })
    } else {
      const orig: any = await StudyModel.findById(study_id)
      await StudyModel.findByIdAndUpdate(study_id, { name: object.name ?? orig.name })
    }

    return {}
  }
  public static async _delete(study_id: string): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {      
      const orig: any = await Database.use("study").get(study_id)
      await Database.use("study").bulk({ docs: [{ ...orig, _deleted: true }] })
    } else {
      await StudyModel.deleteOne({ _id: study_id })
    }
    return {}
  }
}
