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

  public async _listUsers(
    id: string,
    studies: string[],
    search: string,
    sort: string,
    page: string,
    limit: string
  ): Promise<{}> {
    const pageNum = Math.max(1, parseInt(page) || 1)

    const limitNum = Math.min(40, Math.max(1, parseInt(limit) || 40))

    const allStudies = await MongoClientDB.collection("study")
      .find({ _parent: id, _deleted: { $ne: true } })
      .project({ _id: 1, name: 1 })
      .toArray()

    const studyIds = allStudies.map((study: any) => study._id)

    const counts = await MongoClientDB.collection("participant")
      .aggregate([
        {
          $match: {
            _parent: { $in: studyIds },
            _deleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$_parent",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const studyUserCounts: Record<string, number> = counts.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count
      return acc
    }, {})

    if (!studies?.length) {
      return { count: 0, totalUsers: studyUserCounts, page: pageNum, limit: 0, totalPages: 0, users: [] }
    }

    const filteredStudies = allStudies.filter((st: any) => studies.includes(String(st.name)))

    const studyIdsToQuery = filteredStudies.map((st: any) => st._id)

    if (!studyIdsToQuery.length) {
      return { count: 0, totalUsers: studyUserCounts, page: pageNum, limit: 0, totalPages: 0, users: [] }
    }

    const studyMap = Object.fromEntries(filteredStudies.map((s: any) => [s._id, s.name]))

    const query = { _parent: { $in: studyIdsToQuery }, _deleted: { $ne: true } }

    const users = await MongoClientDB.collection("participant").find(query).project({ _id: 1, _parent: 1 }).toArray()

    const userIds = users.map((u: any) => u._id)

    const tags = await MongoClientDB.collection("tag")
      .find({ _parent: { $in: userIds }, key: "lamp.name", type: "me" })
      .project({ value: 1, _parent: 1 })
      .toArray()

    const userNameMap = Object.fromEntries(
      tags.map((tag: any) => {
        try {
          return [tag._parent, JSON.parse(tag.value) || ""]
        } catch {
          return [tag._parent, tag.value || ""]
        }
      })
    )

    let usersList = users.map((u: any) => ({
      _id: u._id,
      studyId: u._parent,
      userName: userNameMap[u._id] || "",
      studyName: studyMap[u._parent] || "",
    }))

    if (search) {
      const regex = new RegExp(search, "i")
      usersList = usersList.filter((u: any) => regex.test(u.userName || u._id))
    }

    usersList.sort((a: any, b: any) => {
      const aVal = a.userName || a._id
      const bVal = b.userName || b._id
      return sort === "asc"
        ? aVal.localeCompare(bVal, undefined, { sensitivity: "base" })
        : bVal.localeCompare(aVal, undefined, { sensitivity: "base" })
    })

    const totalFilteredUsers = usersList.length

    const startIndex = (pageNum - 1) * limitNum
    const paginatedUsers = usersList.slice(startIndex, startIndex + limitNum)

    return {
      count: totalFilteredUsers,
      totalUsers: studyUserCounts,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalFilteredUsers / limitNum) || 0,
      users: paginatedUsers,
    }
  }

  public async _listActivities(
    id: string,
    studies: string[],
    search: string,
    sort: string,
    page: string,
    limit: string
  ): Promise<{}> {
    const allStudies = await MongoClientDB.collection("study")
      .find({ _parent: id, _deleted: { $ne: true } })
      .toArray()

    const studyIds = allStudies.map((study: any) => study._id)

    let activitiesCount = await MongoClientDB.collection("activity").countDocuments({
      _parent: { $in: studyIds },
      _deleted: { $ne: true },
    })

    const counts = await MongoClientDB.collection("activity")
      .aggregate([
        {
          $match: {
            _parent: { $in: studyIds },
            _deleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$_parent",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const studyActivityCounts: Record<string, number> = counts.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count
      return acc
    }, {})

    if (studies.length === 0) {
      return {
        count: activitiesCount,
        totalActivities: studyActivityCounts,
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: 0,
        totalPages: 0,
        activities: [],
      }
    }

    const requestedStudyIds = Array.isArray(studies)
      ? studies.map((s) => (typeof s === "string" ? s : String(s))).filter(Boolean)
      : []

    const filteredStudies =
      requestedStudyIds.length > 0 ? allStudies.filter((st: any) => requestedStudyIds.includes(String(st.name))) : []

    const studiesToQuery = filteredStudies.map((study: any) => study._id)

    if (studiesToQuery.length === 0) {
      return {
        count: activitiesCount,
        totalActivities: studyActivityCounts,
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: 0,
        totalPages: 0,
        activities: [],
      }
    }
    const query: any = {
      _parent: { $in: studiesToQuery },
      _deleted: { $ne: true },
    }

    if (search && typeof search === "string") {
      query.name = { $regex: search, $options: "i" }
    }

    const sortOrder = sort === "desc" ? -1 : 1

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.max(1, parseInt(limit, 10) || 40)

    // Projection: Only fetch fields needed for the list view (exclude settings and other large fields)
    // Note: MongoDB projection can only use inclusion (1) OR exclusion A(0), not bothA
    const projection = {
      _id: 1,
      name: 1,
      spec: 1,
      schedule: 1,
      category: 1,
      _parent: 1,
      timestamp: 1,
      _deleted: 1,
    }

    const [activitiesCountResult, activitiesList] = await Promise.all([
      MongoClientDB.collection("activity").countDocuments(query),
      MongoClientDB.collection("activity")
        .find(query, { projection })
        .sort({ name: sortOrder })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
    ])

    // const activitiesList = await MongoClientDB.collection("activity")
    //   .find(query)
    //   .sort({ name: sortOrder })
    //   .skip((pageNum - 1) * limitNum)
    //   .limit(limitNum)
    //   .toArray()

    // Calculate activitiesCount after performing searching and sorting
    // Note: studyActivityCounts remains unchanged (calculated earlier)
    activitiesCount = activitiesCountResult

    const studyMap = new Map(filteredStudies.map((study: any) => [study._id, study.name]))

    const enrichedActivities = activitiesList.map((activity: any) => ({
      ...activity,
      studyName: studyMap.get(activity._parent) || null,
    }))
    return {
      count: activitiesCount,
      totalActivities: studyActivityCounts,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(activitiesCount / limitNum),
      activities: enrichedActivities,
    }
  }

  public async _listSensors(
    id: string,
    studies: string[],
    search: string,
    sort: string,
    page: string,
    limit: string
  ): Promise<{}> {
    const allStudies = await MongoClientDB.collection("study")
      .find({ _parent: id, _deleted: { $ne: true } })
      .toArray()

    const studyIds = allStudies.map((study: any) => study._id)

    const counts = await MongoClientDB.collection("sensor")
      .aggregate([
        {
          $match: {
            _parent: { $in: studyIds },
            _deleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$_parent",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const studySensorCounts: Record<string, number> = counts.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count
      return acc
    }, {})

    if (studies.length === 0) {
      return {
        count: 0,
        totalSensors: studySensorCounts,
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: 0,
        totalPages: 0,
        sensors: [],
      }
    }

    const requestedStudyIds = Array.isArray(studies)
      ? studies.map((s) => (typeof s === "string" ? s : String(s))).filter(Boolean)
      : []

    const filteredStudies =
      requestedStudyIds.length > 0 ? allStudies.filter((st: any) => requestedStudyIds.includes(String(st.name))) : []

    const studiesToQuery = filteredStudies.map((study: any) => study._id)
    if (studiesToQuery.length === 0) {
      return {
        count: 0,
        totalSensors: studySensorCounts,
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: 0,
        totalPages: 0,
        sensors: [],
      }
    }
    const query: any = {
      _parent: { $in: studiesToQuery },
      _deleted: { $ne: true },
    }

    if (search && typeof search === "string") {
      query.name = { $regex: search, $options: "i" }
    }

    const sortOrder = sort === "desc" ? -1 : 1
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(40, Math.max(1, parseInt(limit, 10) || 40))

    // Calculate sensorsCount after search and sorting (used in count: sensorsCount)
    const sensorsCount = await MongoClientDB.collection("sensor").countDocuments(query)

    const sensors = await MongoClientDB.collection("sensor")
      .find(query)
      .sort({ name: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .toArray()

    const studyMap = new Map(filteredStudies.map((study: any) => [study._id, study.name]))

    const enrichedSensors = sensors.map((sensor: any) => ({
      ...sensor,
      studyName: studyMap.get(sensor._parent) || null,
    }))
    return {
      count: sensorsCount,
      totalSensors: studySensorCounts,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(sensorsCount / limitNum),
      sensors: enrichedSensors,
    }
  }
}
