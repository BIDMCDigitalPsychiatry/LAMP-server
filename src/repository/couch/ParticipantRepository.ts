import { Database, numeric_uuid } from "../Bootstrap"
import { Participant } from "../../model/Participant"
import { ParticipantInterface } from "../interface/RepositoryInterface"

export class ParticipantRepository implements ParticipantInterface {
  public async _select(id: string | null, parent = false): Promise<Participant[]> {
    return (
      await Database.use("participant").find({
        selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((doc: any) => ({
      id: doc._id,
    }))
  }
  // eslint-disable-next-line
  public async _insert(study_id: string, object: Participant): Promise<any> {
    const _id = numeric_uuid()
    //if (study_id === undefined) throw new Error("404.study-does-not-exist") // FIXME
    try {
      await Database.use("participant").insert({
        _id: _id,
        "#parent": study_id,
        timestamp: new Date().getTime(),
      } as any)
    } catch (e) {
      console.error(e)
      throw new Error("500.participant-creation-failed")
    }
    return { id: _id }
  }
  // eslint-disable-next-line
  public async _update(participant_id: string, object: Participant): Promise<{}> {
    throw new Error("503.unimplemented")
  }
  public async _delete(participant_id: string): Promise<{}> {
    try {
      const orig = await Database.use("participant").get(participant_id)
      const data = await Database.use("participant").bulk({
        docs: [{ ...orig, _deleted: true }],
      })
      if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  /**  get Participants. There would be a need for pagination of the data. So, its seperately written
   *
   * @param id
   * @param parent
   * @returns Array Participant[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Participant[]> {
    return (
      await Database.use("participant").find({
        selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
        sort: [{ timestamp: "asc" }],
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.map((doc: any) => ({
      id: doc._id,
      study_id: doc["#parent"],
    }))
  }
}
