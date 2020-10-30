import { Database, uuid } from "../app"
import { Study } from "../model/Study"

export class StudyRepository {
  public static async _select(id: string | null, parent: boolean = false): Promise<Study[]> {
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
  }
  public static async _insert(researcher_id: string, object: Study): Promise<string> {
    const _id = uuid()
    await Database.use("study").insert({
      _id: _id,
      "#parent": researcher_id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
    } as any)
    return _id
  }
  public static async _update(study_id: string, object: Study): Promise<{}> {
    const orig: any = await Database.use("study").get(study_id)
    await Database.use("study").bulk({ docs: [{ ...orig, name: object.name ?? orig.name }] })
    return {}
  }
  public static async _delete(study_id: string): Promise<{}> {
    const orig: any = await Database.use("study").get(study_id)
    await Database.use("study").bulk({ docs: [{ ...orig, _deleted: true }] })
    return {}
  }
}
