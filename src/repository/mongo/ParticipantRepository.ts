import { numeric_uuid } from "../Bootstrap"
import { Participant } from "../../model/Participant"
import { ParticipantModel } from "../../model/Participant"
import { ParticipantInterface } from "../interface/RepositoryInterface"

export class ParticipantRepository implements ParticipantInterface {
  public async _select(id: string | null, parent = false): Promise<Participant[]> {
    //get data from  Participant via  Participant model
    const data = await ParticipantModel.find(
      !!id ? (parent ? { _parent: id, _deleted: false } : { _id: id, _deleted: false }) : { _deleted: false }
    )
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
    }))
  }
  // eslint-disable-next-line
  public async _insert(study_id: string, object: Participant): Promise<any> {
    const _id = numeric_uuid()
    //if (study_id === undefined) throw new Error("404.study-does-not-exist") // FIXME
    try {
      //save Participant via Participant model
      await new ParticipantModel({
        _id: _id,
        _parent: study_id,
        timestamp: new Date().getTime(),
      } as any).save()
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
      await ParticipantModel.updateOne({ _id: participant_id }, { _deleted: true })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }
  /** get Participants. There would be a need for pagination of the data. So, its seperately written
   *
   * @param id
   * @param parent
   * @returns Array Participant[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Participant[]> {
    //get data from  Participant via  Participant model
    const data = await ParticipantModel.find(
      !!id ? (parent ? { _parent: id, _deleted: false } : { _id: id, _deleted: false }) : { _deleted: false }
    )
      .sort({ timestamp: 1 })
      .limit(2_147_483_647)
    return (data as any).map((x: any) => ({
      id: x._doc._id,
      study_id: x._doc._parent,
    }))
  }
}
