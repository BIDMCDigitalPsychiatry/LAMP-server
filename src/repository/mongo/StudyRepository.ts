import { uuid } from "../Bootstrap"
import { Study } from "../../model/Study"
import { StudyInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

export class StudyRepository implements StudyInterface {
  public async _select(id: string | null, parent = false): Promise<Study[]> {
    const data = await MongoClientDB.collection("study")
      .find(!!id ? (parent ? { _deleted: false, _parent: id } : { _deleted: false, _id: id }) : { _deleted: false })
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
      .maxTimeMS(60000)
      .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      _deleted: undefined,
      timestamp: undefined,
      __v: undefined,
    }))
  }
  public async _insert(researcher_id: string, object: Study): Promise<string> {
    const _id = uuid()
    await MongoClientDB.collection("study").insertOne({
      _id: _id,
      _parent: researcher_id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
      _deleted: false,
    })
    return _id
  }
  public async _update(study_id: string, object: Study): Promise<{}> {
    const orig: any = await MongoClientDB.collection("study").findOne(study_id)
    await MongoClientDB.collection("study").findOneAndUpdate(
      { _id: orig._id },
      { $set: { name: object.name ?? orig.name } }
    )
    return {}
  }
  public async _delete(study_id: string): Promise<{}> {
    await MongoClientDB.collection("study").updateOne({ _id: study_id }, { $set: { _deleted: true } })
    return {}
  }
}
