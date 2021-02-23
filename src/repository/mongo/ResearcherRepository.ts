import { uuid } from "../Bootstrap"
import { Researcher } from "../../model/Researcher"
import { ResearcherModel } from "../../model/Researcher"
import { StudyModel } from "../../model/Study"
import { ResearcherInterface } from "../interface/RepositoryInterface"

export class ResearcherRepository implements ResearcherInterface {
  public async _select(id?: string): Promise<[]> {
    const data = !!id ? await ResearcherModel.find({ _id: id }) : await ResearcherModel.find({}).sort({ timestamp: 1 })

    return (data as any).map((x: any) => ({
      id: x._doc._id,
      ...x._doc,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      timestamp: undefined,
    }))
  }
  public async _insert(object: Researcher): Promise<string> {
    const _id = uuid()
    const session = await ResearcherModel.startSession()
    session.startTransaction()
    //save data in Mongo
    await new ResearcherModel({
      _id: _id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
    } as any).save()

    // TODO: to match legacy behavior we create a default study as well
    const _id2 = uuid()
    await new StudyModel({
      _id: _id2,
      _parent: _id,
      timestamp: new Date().getTime(),
      name: object.name ?? "",
    } as any).save()
    await session.commitTransaction()
    session.endSession()

    return _id
  }
  public async _update(researcher_id: string, object: Researcher): Promise<{}> {
    const orig: any = await ResearcherModel.findById(researcher_id)
    await ResearcherModel.findByIdAndUpdate(researcher_id, { name: object.name ?? orig.name })

    return {}
  }
  public async _delete(researcher_id: string): Promise<{}> {
    const session = await ResearcherModel.startSession()
    session.startTransaction()
    await StudyModel.deleteMany({ _parent: researcher_id })
    await ResearcherModel.deleteOne({ _id: researcher_id })
    await session.commitTransaction()
    session.endSession()

    return {}
  }
}
