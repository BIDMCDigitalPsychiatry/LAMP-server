import { uuid } from "../Bootstrap"
import { Researcher } from "../../model/Researcher"
import { ResearcherInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class ResearcherRepository implements ResearcherInterface {
  public async _select(id?: string): Promise<[]> {
    const data = !!id
      ? await MongoClientDB.collection("researcher").find({ _deleted: false, _id: id }).maxTimeMS(60000).toArray()
      : await MongoClientDB.collection("researcher")
          .find({ _deleted: false })
          .sort({ timestamp: 1 })
          .maxTimeMS(60000)
          .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      _deleted: undefined,
      timestamp: undefined,
    }))
  }
  public async _insert(object: Researcher): Promise<string> {
    const _id = uuid()
    //save data in Mongo
    await MongoClientDB.collection("researcher").insertOne({
      _id: _id,
      name: object.name ?? "",
      timestamp: new Date().getTime(),
      _deleted: false,
    })

    // TODO: to match legacy behavior we create a default study as well
    const _id2 = uuid()
    await MongoClientDB.collection("study").insertOne({
      _id: _id2,
      _parent: _id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
      _deleted: false,
    })

    return _id
  }
  public async _update(researcher_id: string, object: Researcher): Promise<{}> {
    const orig: any = await MongoClientDB.collection("researcher").findOne({ _id: researcher_id })
    await MongoClientDB.collection("researcher").findOneAndUpdate(
      { _id: orig._id },
      { $set: { name: object.name ?? orig.name } }
    )

    return {}
  }
  public async _delete(researcher_id: string): Promise<{}> {
    await MongoClientDB.collection("study").updateMany({ _parent: researcher_id }, { $set: { _deleted: true } })
    await MongoClientDB.collection("researcher").updateOne({ _id: researcher_id }, { $set: { _deleted: true } })
    return {}
  }
}
