import { Database, numeric_uuid } from "./Bootstrap"
import { Participant } from "../model/Participant"
import { ParticipantModel } from "../model/Participant"

export class ParticipantRepository {
  public static async _select(id: string | null, parent = false): Promise<Participant[]> {
    //get data from  Participant via  Participant model
    if (process.env.DB_DRIVER === "couchdb") {
      return (
        await Database.use("participant").find({
          selector: id === null ? {} : { [parent ? "#parent" : "_id"]: id },
          sort: [{ timestamp: "asc" }],
          limit: 2_147_483_647 /* 32-bit INT_MAX */,
        })
      ).docs.map((doc: any) => ({
        id: doc._id,
      }))
    } else {
      const data = await ParticipantModel.find(!!id ? (parent ? { "#parent": id } : { _id: id }) : {})
        .sort({ timestamp: 1 })
        .limit(2_147_483_647)

      return (data as any).map((x: any) => ({
        id: x._doc._id,
      }))
    }
  }
  // eslint-disable-next-line
  public static async _insert(study_id: string, object: Participant): Promise<any> {
    const _id = numeric_uuid()
    //if (study_id === undefined) throw new Error("404.study-does-not-exist") // FIXME
    try {
      //save Participant via Participant model
      process.env.DB_DRIVER === "couchdb"
        ? await Database.use("participant").insert({
            _id: _id,
            "#parent": study_id,
            timestamp: new Date().getTime(),
          } as any)
        : await new ParticipantModel({
            _id: _id,
            "#parent": study_id,
            timestamp: new Date().getTime(),
          } as any).save()
    } catch (e) {
      console.error(e)
      throw new Error("500.participant-creation-failed")
    }
    return { id: _id }
  }
  // eslint-disable-next-line
  public static async _update(participant_id: string, object: Participant): Promise<{}> {
    throw new Error("503.unimplemented")
  }
  public static async _delete(participant_id: string): Promise<{}> {
    try {
      if (process.env.DB_DRIVER === "couchdb") {
        const orig = await Database.use("participant").get(participant_id)
        const data = await Database.use("participant").bulk({
          docs: [{ ...orig, _deleted: true }],
        })
        if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
      } else {
        // await ParticipantModel.findByIdAndUpdate(participant_id,{_deleted: true})
        await ParticipantModel.deleteOne({ _id: participant_id })
      }
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
}
