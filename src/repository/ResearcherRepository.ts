import { Database, uuid } from "./Bootstrap"
import { Researcher } from "../model/Researcher"
import { ResearcherModel } from "../model/Researcher"
import { StudyModel } from "../model/Study"

export class ResearcherRepository {
  public static async _select(id?: string): Promise<Researcher[]> {
    if (process.env.DB_DRIVER === "couchdb") {
      return (
        await Database.use("researcher").find({
          selector: !!id ? { _id: id } : {},
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
      const data = !!id
        ? await ResearcherModel.find({ _id: id })
        : await ResearcherModel.find({}).sort({ timestamp: 1 })

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
  public static async _insert(object: Researcher): Promise<string> {
    const _id = uuid()
    //save data in CouchDb/Mongo
    if (process.env.DB_DRIVER === "couchdb") {
       await Database.use("researcher").insert({
          _id: _id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any)
      } else { 
        await new ResearcherModel({
          _id: _id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any).save()
        }
    // TODO: to match legacy behavior we create a default study as well
    const _id2 = uuid()

    //save default study via study model
    if (process.env.DB_DRIVER === "couchdb") {
        await Database.use("study").insert({
          _id: _id2,
          "#parent": _id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any)
      } else {
        await new StudyModel({
          _id: _id2,
          "#parent": _id,
          timestamp: new Date().getTime(),
          name: object.name ?? "",
        } as any).save()
      }
    return _id
  }
  public static async _update(researcher_id: string, object: Researcher): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
      const orig: any = await Database.use("researcher").get(researcher_id)
      await Database.use("researcher").bulk({ docs: [{ ...orig, name: object.name ?? orig.name }] })
    } else {
      const orig: any = await ResearcherModel.findById(researcher_id)
      await ResearcherModel.findByIdAndUpdate(researcher_id, { name: object.name ?? orig.name })
    }
    return {}
  }
  public static async _delete(researcher_id: string): Promise<{}> {
    if (process.env.DB_DRIVER === "couchdb") {
      const orig: any = await Database.use("researcher").get(researcher_id)
      await Database.use("researcher").bulk({ docs: [{ ...orig, _deleted: true }] })
      // TODO: to match legacy behavior we delete all child studies as well
      const studies = (
        await Database.use("study").find({
          selector: { "#parent": researcher_id },
          sort: [{ timestamp: "asc" }],
          limit: 2_147_483_647 /* 32-bit INT_MAX */,
        })
      ).docs
      await Database.use("study").bulk({ docs: studies.map((x: any) => ({ ...x, _deleted: true })) })
    } else {
      const session = await ResearcherModel.startSession()
      session.startTransaction()
      await StudyModel.deleteMany({ "#parent": researcher_id })
      await ResearcherModel.deleteOne({ _id: researcher_id })
      await session.commitTransaction()
      session.endSession()
    }
    return {}
  }
}
