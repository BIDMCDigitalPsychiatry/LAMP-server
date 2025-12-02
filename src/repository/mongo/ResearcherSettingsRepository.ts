import { ResearcherSettingsInterface } from "../interface/RepositoryInterface"
import { ResearcherSettings } from "../../model/ResearcherSettings"
import { MongoClientDB } from "../Bootstrap"
import { uuid } from "../Bootstrap"

export class ResearcherSettingsRepository implements ResearcherSettingsInterface {
  public async _select(type: string, id: string): Promise<{}> {
    let data: any = {}
    let studyId: string = ""
    if (type === "researcher") {
      data = await MongoClientDB.collection("Researcher_settings").findOne(
        { _deleted: false, _parent: id },
        {
          sort: { timestamp: -1 },
          maxTimeMS: 60000,
        }
      )

      const studyData = await MongoClientDB.collection("study").findOne({ _deleted: false, _parent: id })
      studyId = studyData._id

      if (data) {
        const activityIdsToCheck = [data.selectedActivity, data.activityId, data.featuredActivity].filter(Boolean)

        const existingActivities = await MongoClientDB.collection("activity")
          .find({ _id: { $in: activityIdsToCheck }, _parent: studyId, _deleted: false })
          .project({ _id: 1 })
          .toArray()

        const validIds = new Set(existingActivities.map((a: any) => a._id))

        if (!validIds.has(data.selectedActivity)) {
          data.selectedActivity = ""
        }
        if (!validIds.has(data.activityId)) {
          data.activityId = ""
        }
        if (!validIds.has(data.featuredActivity)) {
          data.featuredActivity = ""
        }
      }
    } else {
      data = await MongoClientDB.collection("Researcher_settings").findOne(
        { _deleted: false, studyId: id },
        { sort: { timestamp: -1 } },
        {
          maxTimeMS: 60000,
        }
      )
      studyId = id
      if (data) {
        const activityIdsToCheck = [data.selectedActivity, data.activityId, data.featuredActivity].filter(Boolean)

        const existingActivities = await MongoClientDB.collection("activity")
          .find({ _id: { $in: activityIdsToCheck }, _parent: studyId, _deleted: false })
          .project({ _id: 1 })
          .toArray()

        const validIds = new Set(existingActivities.map((a: any) => a._id))
        if (!validIds.has(data.selectedActivity)) {
          data.selectedActivity = ""
        }
        if (!validIds.has(data.activityId)) {
          data.activityId = ""
        }
        if (!validIds.has(data.featuredActivity)) {
          data.featuredActivity = ""
        }
      }
    }

    const response = {
      ResearcherSettings: {
        banner_settings: {
          bannerGreeting: data?.bannerGreeting ?? "",
          bannerHeading: data?.bannerHeading ?? "",
          bannerSubHeading: data?.bannerSubHeading ?? "",
          imageBase64: data?.imageBase64 ?? "",
          selectedActivity: data?.selectedActivity ?? "",
          selectedGroup: data?.studyId ?? studyId,
          featuredActivity: data?.featuredActivity ?? "",
        },
        small_action_settings: {
          buttonText: data?.buttonText ?? "",
          activityId: data?.activityId ?? "",
        },
        favouriteActivities: data?.favouriteActivities ?? [],
      },
    }

    return response
  }
  public async _insert(id: string, object: ResearcherSettings, choice?: string): Promise<string> {
    const _id = uuid()
    await MongoClientDB.collection("Researcher_settings").insertOne({
      _id: _id,
      _parent: id,
      bannerGreeting: object.bannerGreeting,
      bannerHeading: object.bannerHeading,
      bannerSubHeading: object.bannerSubHeading,
      imageBase64: object.imageBase64,
      selectedActivity: object.selectedActivity,
      studyId: object.selectedGroup,
      featuredActivity: object.featuredActivity,
      buttonText: object.buttonText,
      activityId: object.activityId,
      favouriteActivities: choice === "custom" ? object.favouriteActivities : [],
      timestamp: new Date().getTime(),
      _deleted: false,
    })
    return ""
  }
  public async _get(id?: string): Promise<{}> {
    const participant = await MongoClientDB.collection("participant").findOne({
      _id: id,
    })

    if (!participant) {
      throw new Error("404.There is no such participant")
    }
    const studyId = participant._parent

    await MongoClientDB.collection("activity").findOne({ _deleted: true, _parent: studyId })

    const researcherSettings = await MongoClientDB.collection("Researcher_settings").findOne(
      {
        _deleted: false,
        studyId: studyId,
      },
      {
        sort: { timestamp: -1 },
        maxTimeMS: 60000,
      }
    )

    if (researcherSettings) {
      const activityIdsToCheck = [
        researcherSettings.selectedActivity,
        researcherSettings.activityId,
        researcherSettings.featuredActivity,
      ].filter(Boolean)

      const existingActivities = await MongoClientDB.collection("activity")
        .find({ _id: { $in: activityIdsToCheck }, _parent: studyId, _deleted: false })
        .project({ _id: 1 })
        .toArray()

      const validIds = new Set(existingActivities.map((a: any) => a._id))

      if (!validIds.has(researcherSettings.selectedActivity)) {
        researcherSettings.selectedActivity = ""
      }
      if (!validIds.has(researcherSettings.activityId)) {
        researcherSettings.activityId = ""
      }
      if (!validIds.has(researcherSettings.featuredActivity)) {
        researcherSettings.featuredActivity = ""
      }
    }

    if (researcherSettings === null) throw new Error("404.No researcher settings available for current user")

    return researcherSettings
  }
}
