import { Database, uuid } from "../app"
import { Researcher } from "../model/Researcher"

export class ResearcherRepository {
  public static async _select(id?: string): Promise<Researcher[]> {
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
  }
  public static async _insert(object: Researcher): Promise<string> {
    const _id = uuid()
    await Database.use("researcher").insert({
      _id: _id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
    } as any)
    // TODO: to match legacy behavior we create a default study as well
    const _id2 = uuid()
    await Database.use("study").insert({
      _id: _id2,
      "#parent": _id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
    } as any)
    return _id
  }
  public static async _update(researcher_id: string, object: Researcher): Promise<{}> {
    const orig: any = await Database.use("researcher").get(researcher_id)
    await Database.use("researcher").bulk({ docs: [{ ...orig, name: object.name ?? orig.name }] })
    return {}
  }
  public static async _delete(researcher_id: string): Promise<{}> {
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
    await Database.use("study").bulk({ docs: studies.map((x) => ({ ...x, _deleted: true })) })
    return {}
  }
}
