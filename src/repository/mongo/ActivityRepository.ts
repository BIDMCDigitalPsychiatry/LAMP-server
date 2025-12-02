import { uuid } from "../Bootstrap"
import { Activity } from "../../model/Activity"
import { ActivityInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
import { Repository } from "../Bootstrap"

export class ActivityRepository implements ActivityInterface {
  public async _select(
    id: string | null,
    parent = false,
    ignore_binary = false,
    limit?: number,
    offset?: number,
    participantId?: string
  ): Promise<{ data: Activity[]; total: number }> {
    // Optimized path for single activity lookup (most common case for /activity/:activity_id)
    if (!parent && id) {
      // Optimize projection: exclude settings field from database query when ignore_binary is true
      const projection: any = {
        name: 1,
        spec: 1,
        schedule: 1,
        _parent: 1,
        category: 1,
        timestamp: 1,
      }

      // Only include settings in projection if we need it (ignore_binary = false)
      if (!ignore_binary) {
        projection.settings = 1
      }

      // Use findOne for single document lookup (more efficient than find().limit(1))
      const activity = await MongoClientDB.collection("activity").findOne({ _id: id, _deleted: false }, { projection })

      if (!activity) {
        // Return empty array for backward compatibility
        return { data: [], total: 0 }
      }

      // Map result - settings already excluded from projection when ignore_binary is true
      const result = {
        id: activity._id,
        studyId: activity._parent,
        name: activity.name,
        spec: activity.spec,
        schedule: activity.schedule ?? [],
        category: activity.category,
        settings: ignore_binary ? undefined : activity.settings,
      }
      // Return as array for backward compatibility
      return { data: [result], total: 1 }
    }

    // Original logic for parent queries (list of activities)
    const queryFilter = parent ? (id ? { _parent: id, _deleted: false } : { _deleted: false }) : { _deleted: false }

    // Get total count (only if pagination is needed)
    let total = 0
    if ((typeof limit === "number" && limit > 0) || (typeof offset === "number" && offset > 0)) {
      total = await MongoClientDB.collection("activity").countDocuments(queryFilter)
    }

    // Optimized projection for /study/:studyId/activity
    // Base fields: id, name, spec
    // Additional fields when ignore_binary is false: studyId (_parent), settings
    const projection: any = {
      _id: 1,
      name: 1,
      spec: 1,
    }

    // Include studyId and settings when ignore_binary is false
    if (!ignore_binary) {
      projection._parent = 1
      projection.settings = 1
    }

    // Build query with optimized projection
    // Exclude favorite activities from the main query to avoid duplicates
    const mainQueryFilter: any = { ...queryFilter }

    let query = MongoClientDB.collection("activity").find(mainQueryFilter).project(projection).sort({ timestamp: 1 })

    // Apply pagination if provided
    // If we have favorites, we need to adjust the limit to account for them
    let adjustedLimit = limit
    if (typeof limit === "number" && limit > 0) {
      adjustedLimit = limit
      // Ensure adjustedLimit is at least 0
      adjustedLimit = Math.max(0, adjustedLimit)
    }

    if (typeof offset === "number" && offset > 0) {
      query = query.skip(offset)
    }
    if (typeof adjustedLimit === "number" && adjustedLimit > 0) {
      query = query.limit(adjustedLimit)
    }

    const mainActivities = await query.toArray()

    // Map results - return id, name, spec, and conditionally studyId and settings
    const mainResult = mainActivities.map((x: any) => {
      const result: any = {
        id: x._id,
        name: x.name,
        spec: x.spec,
      }
      // Include studyId and settings when ignore_binary is false
      if (!ignore_binary) {
        result.studyId = x._parent
        result.settings = x.settings
      }
      return result
    })

    // Combine favorites (first) with main results
    const result = offset === 0 ? [...mainResult] : mainResult

    // If limit or offset are provided, return paginated format
    // Otherwise, return array directly for backward compatibility
    if ((typeof limit === "number" && limit > 0) || (typeof offset === "number" && offset >= 0)) {
      return { data: result, total }
    }

    return result
  }
  public async _list(
    id?: string,
    tab?: string,
    limit?: number,
    offset?: number
  ): Promise<{ data: any; total: number }> {
    const participant = await MongoClientDB.collection("participant").findOne({ _id: id, _deleted: false })

    // Fetch ALL activities matching the category (no pagination on query)
    // We'll apply priority-based pagination after separating into categories
    const mainActivities = await MongoClientDB.collection("activity")
      .find({ _parent: participant._parent, category: tab, _deleted: false })
      .project({
        name: 1,
        spec: 1,
        schedule: 1,
        _parent: 1,
        settings: 1,
        track_progress: 1,
        timestamp: 1,
        SubActivitiesCompleted: 1,
        totalSubActivites: 1,
        started: 1,
      })
      .sort({ timestamp: 1 })
      .toArray()

    // Get total count for pagination
    const total = mainActivities.length

    // Process only the modules needed for current pagination batch
    // This significantly reduces database queries

    // Use full modules list for exclusion, not just processed batch

    const allOtherActivities = mainActivities.map((a: any) => ({
      id: a._id?.toString(),
      name: a.name,
      spec: a.spec,
      schedule: a.schedule ?? [],
    }))

    // Apply priority-based pagination if offset is provided
    // Priority: Modules (20) > Other Activities (20) > Favorite Activities (20) = 60 items per batch
    // Each batch contains: 20 modules + 20 other activities + 20 favorites
    // offset = 0: first batch (items 0-59)
    // offset = 60: second batch (items 60-119)
    if (typeof offset === "number" && offset >= 0) {
      const itemsPerCategory = limit || 50
      const batchNumber = Math.floor(offset / itemsPerCategory)
      const startIndex = batchNumber * itemsPerCategory

      // Other Activities: second priority - always try to return 20, or all if fewer than 20
      const paginatedOtherActivities = allOtherActivities.slice(startIndex, startIndex + itemsPerCategory)

      return {
        data: {
          otherActivities: paginatedOtherActivities,
        },
        total,
      }
    }

    // No pagination: return all items
    return {
      data: {
        otherActivities: allOtherActivities,
      },
      total,
    }
  }

  public async _insert(study_id: string, object: Activity): Promise<any> {
    const _id = uuid()
    //save Activity via Activity model
    await MongoClientDB.collection("activity").insertOne({
      _id: _id,
      _parent: study_id,
      timestamp: new Date().getTime(),
      spec: object.spec ?? "__broken_link__",
      name: object.name ?? "",
      settings: object.settings ?? {},
      schedule: object.schedule ?? [],
      category: object.category ?? null,
      _deleted: false,
    } as any)

    return _id
  }
  public async _update(activity_id: string, object: Activity): Promise<{}> {
    const orig: any = await MongoClientDB.collection("activity").findOne({ _id: activity_id })
    const schedules: any = object.schedule ?? undefined
    const newSchedules: object[] = []

    if (!!schedules) {
      //find notification id for schedules
      for (let schedule of schedules) {
        //if not custom, single notification id would be there
        if (schedule.repeat_interval !== "custom") {
          const notificationId: number = Math.floor(Math.random() * 1000000) + 1
          schedule = { ...schedule, notification_ids: [notificationId] }
          await newSchedules.push(schedule)
        } else {
          //if  custom, multiple notification ids would be there
          if (!!schedule.custom_time) {
            const custNotids: number[] = []
            //find notification id for multiple custom times
            for (const customTimes of schedule.custom_time) {
              const notificationId: number = Math.floor(Math.random() * 1000000) + 1
              custNotids.push(notificationId)
            }
            schedule = { ...schedule, notification_ids: custNotids }
            await newSchedules.push(schedule)
          }
        }
      }
    }
    await MongoClientDB.collection("activity").findOneAndUpdate(
      { _id: orig._id },
      {
        $set: {
          name: object.name ?? orig.name,
          settings: object.settings ?? orig.settings,
          category: object.category ?? orig.category,
          schedule: (newSchedules.length !== 0 ? newSchedules : object.schedule) ?? orig.schedule,
        },
      }
    )

    return {}
  }
  public async _delete(activity_id: string): Promise<{}> {
    try {
      await MongoClientDB.collection("activity").updateOne({ _id: activity_id }, { $set: { _deleted: true } })
    } catch (e) {
      console.error(e)
      throw new Error("500.deletion-failed")
    }
    return {}
  }

  public async _deleteActivities(activities: string[]): Promise<{}> {
    try {
      const result = await MongoClientDB.collection("activity").updateMany(
        { _id: { $in: activities } },
        { $set: { _deleted: true } }
      )

      await MongoClientDB.collection("tag").updateMany(
        {
          key: { $in: ["lamp.dashboard.favorite_activities", "lamp.dashboard.hide_activities"] },
          value: { $type: "array" },
        },
        {
          $pull: { value: { $in: activities } },
        }
      )

      // For object-valued tags, remove entries whose keys match deleted activity IDs
      await MongoClientDB.collection("tag").updateMany(
        {
          key: { $in: ["lamp.dashboard.survey_description", "lamp.dashboard.activity_details"] },
          value: { $type: "object" },
        },
        [
          {
            $set: {
              value: {
                $arrayToObject: {
                  $filter: {
                    input: { $objectToArray: "$value" },
                    as: "kv",
                    cond: { $not: { $in: ["$$kv.k", activities] } },
                  },
                },
              },
            },
          },
        ]
      )

      console.log(`${result.deletedCount} activities deleted successfully`)
    } catch (error) {
      console.error("Error deleting activities:", error)
    }
    return {}
  }

  /** get activities with settings excluded
   *
   * @param id
   * @param parent
   * @returns Array Activity[]
   */
  public async _lookup(id: string | null, parent = false): Promise<Activity[]> {
    const data = await MongoClientDB.collection("activity")
      .aggregate([
        parent
          ? { $match: !!id ? { _parent: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } }
          : { $match: !!id ? { _id: { $eq: id }, _deleted: { $eq: false } } : { _deleted: { $eq: false } } },
        { $project: { name: 1, spec: 1, schedule: 1, _parent: 1, category: 1 } },
        { $sort: { timestamp: 1 } },
        { $limit: 2_147_483_647 },
      ])
      .maxTimeMS(120000)
      .toArray()
    return (data as any).map((x: any) => ({
      id: x._id,
      ...x,
      _id: undefined,
      _parent: undefined,
      settings: undefined,
      _deleted: undefined,
      study_id: x._parent,
      __v: undefined,
      timestamp: undefined,
    }))
  }

  public async _listModule(moduleId: any, participantId: any): Promise<any> {
    const depth = 0,
      maxDepth = 3,
      parentChain: string[] = []
    const moduleData = await getModuleProgress(moduleId, participantId, depth, maxDepth, parentChain)

    async function getModuleProgress(
      moduleId: string,
      participantId: string,
      depth = 1,
      maxDepth = 3,
      parentChain: string[] = []
    ): Promise<any[]> {
      if (depth > maxDepth) return []

      // 1. Fetch module + subActivities
      const module = await MongoClientDB.collection("activity")
        .aggregate([
          { $match: { _id: moduleId, spec: "lamp.module", _deleted: false } },
          {
            $lookup: {
              from: "activity",
              localField: "settings.activities",
              foreignField: "_id",
              as: "subActivities",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              spec: 1,
              settings: 1,
              "subActivities._id": 1,
              "subActivities.name": 1,
              "subActivities.spec": 1,
              "subActivities.description": 1,
              "subActivities.settings": 1,
            },
          },
        ])
        .next()

      if (!module) throw new Error(`Module with id ${moduleId} not found.`)

      // 2. Fetch module events
      const moduleEvents = await MongoClientDB.collection("activity_event")
        .find({ activity: moduleId, _parent: participantId })
        .sort({ timestamp: 1 })
        .toArray()

      // pick first event timestamp (if any)
      let filterTimestamp: number | null = null
      if (moduleEvents.length > 0) {
        filterTimestamp = moduleEvents[0].timestamp
      }

      const subIds = module.settings.activities ?? []

      // 3. Fetch sub-activity events after parent timestamp
      const getSubEventsAfter = async (ts: number) => {
        return MongoClientDB.collection("activity_event")
          .aggregate([
            {
              $match: {
                activity: { $in: subIds },
                _parent: participantId,
                ...(ts ? { timestamp: { $gt: ts } } : {}),
              },
            },
            { $group: { _id: "$activity", lastEvent: { $max: "$timestamp" } } },
          ])
          .toArray()
      }

      let subEvents: any[] = []
      if (filterTimestamp !== null) {
        subEvents = await getSubEventsAfter(filterTimestamp)
      }

      const eventMap = Object.fromEntries(
        subEvents.map((se: { _id: string; lastEvent: number }) => [se._id, se.lastEvent])
      )

      const currentChain = [...parentChain, module._id]

      // 4. Build subActivities (flatten modules/groups separately)
      const subActivities: any[] = []
      const extraEntries: any[] = []

      for (const sa of module.subActivities) {
        let isCompleted = false
        let startTime = undefined
        if (filterTimestamp !== null) {
          // Parent module is started, check sub-activity event
          const subEventTs = eventMap[sa._id]

          if (sa.spec === "lamp.module") {
            // Check if submodule itself is started
            const subModuleEvents = await MongoClientDB.collection("activity_event")
              .find({ activity: sa._id, _parent: participantId, timestamp: { $gte: filterTimestamp ?? 0 } })
              .sort({ timestamp: 1 })
              .toArray()

            let subModuleTimestamp: number | null = null
            if (subModuleEvents.length > 0) {
              subModuleTimestamp = subModuleEvents[0].timestamp
            }

            if (subModuleTimestamp !== null && subModuleTimestamp >= filterTimestamp) {
              // Submodule is started, so check its sub-activities recursively
              const child = await getModuleProgressWithParentTimestamp(
                sa._id,
                participantId,
                depth + 1,
                maxDepth,
                currentChain,
                subModuleTimestamp, // pass submodule's own timestamp
                subModuleEvents.length
              )
              const childModule = child[0]
              isCompleted = !!childModule && childModule.isCompleted
              startTime = childModule?.subActivities?.find((sub: { isCompleted: any }) => sub.isCompleted)?.startTime
              if (child && child.length > 0) {
                child[0].parent = module._id
              }
              subActivities.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parentString: currentChain.join(">"),
                parentModule: module._id,
                isCompleted,
                startTime,
              })

              extraEntries.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parent: module._id,
                settings: sa.settings,
                isHidden: true,
                subActivities: childModule?.subActivities ?? [],
                sequentialOrdering: !!sa.settings?.sequential_ordering,
                trackProgress: !!sa.settings?.track_progress,
              })
              if (child.length > 1) {
                extraEntries.push(...child.slice(1))
              }
            } else {
              // Submodule is NOT started, so all its sub-activities are not completed
              const child = await getModuleProgressWithParentTimestamp(
                sa._id,
                participantId,
                depth + 1,
                maxDepth,
                currentChain,
                null, // force null so all submodule subactivities are also false
                0
              )
              const childModule = child[0]
              if (child && child.length > 0) {
                child[0].parent = module._id
              }
              subActivities.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parentString: currentChain.join(">"),
                parentModule: module._id,
                isCompleted: false,
                startTime: undefined,
              })

              extraEntries.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parent: module._id,
                settings: sa.settings,
                isHidden: true,
                subActivities: childModule?.subActivities ?? [],
                sequentialOrdering: !!sa.settings?.sequential_ordering,
                trackProgress: !!sa.settings?.track_progress,
              })
              if (child.length > 1) {
                extraEntries.push(...child.slice(1))
              }
            }
          } else {
            // For non-module sub-activities, completed if event exists after parent module event
            isCompleted = subEventTs !== undefined && subEventTs > filterTimestamp
            startTime = isCompleted ? new Date(subEventTs).toISOString() : undefined

            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted,
              startTime,
            })
          }
        } else {
          // Parent module is NOT started: recursively build submodules with all isCompleted: false
          if (sa.spec === "lamp.module") {
            const child = await getModuleProgressWithParentTimestamp(
              sa._id,
              participantId,
              depth + 1,
              maxDepth,
              currentChain,
              null, // force null so all submodule subactivities are also false
              0
            )
            const childModule = child[0]

            if (childModule && Array.isArray(childModule.subActivities)) {
              childModule.subActivities = childModule.subActivities.map((sub: any) => ({
                ...sub,
                isCompleted: false,
                startTime: undefined,
              }))
            }
            if (child && child.length > 0) {
              child[0].parent = module._id
            }
            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted: false,
              startTime: undefined,
            })

            extraEntries.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parent: module._id,
              settings: sa.settings,
              isHidden: true,
              subActivities: childModule?.subActivities ?? [],
              sequentialOrdering: !!sa.settings?.sequential_ordering,
              trackProgress: !!sa.settings?.track_progress,
            })
            if (child.length > 1) {
              extraEntries.push(...child.slice(1))
            }
          } else {
            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted: false,
              startTime: undefined,
            })
          }
        }
      }
      // 5. Sequential ordering
      if (module.settings?.sequential_ordering) {
        let foundIncomplete = false
        for (let i = 0; i < subActivities.length; i++) {
          if (foundIncomplete) {
            subActivities[i].next = false
          } else if (!subActivities[i].isCompleted) {
            foundIncomplete = true
            subActivities[i].next = true
          } else {
            subActivities[i].next = false
          }
        }
      }

      // 6. Track progress
      if (module.settings?.track_progress) {
        for (let i = 0; i < subActivities.length; i++) {
          if (subActivities[i].spec === "lamp.module") {
            if (moduleEvents.length > 0) {
              module.progress = "started"
            } else {
              module.progress = "not_started"
            }
          } else {
            if (!subActivities[i].isCompleted) {
              subActivities[i].progress = "not_started"
            }
          }
        }
      }

      // 7. Final module result
      const moduleResult = {
        id: module._id,
        name: module.name,
        spec: module.spec,
        subActivities,
        level: depth + 1,
        trackProgress: !!module.settings?.track_progress,
        isCompleted:
          filterTimestamp !== null && subActivities.length > 0 && subActivities.every((sa) => sa.isCompleted === true),
      }

      if (moduleResult.isCompleted && moduleEvents.length === 1) {
        const ActivityEventRepository = new Repository().getActivityEventRepository()
        const startTime = moduleEvents[0]?.timestamp ?? Date.now()
        const now = Date.now()
        const duration = now - startTime
        // Prepare the event object
        const event = {
          activity: module._id,
          timestamp: now,
          duration: duration,
          _parent: participantId,
          static_data: {},
          temporal_slices: [],
        }

        await ActivityEventRepository._insert(participantId, [event])
      }

      return [moduleResult, ...extraEntries]
    }

    async function getModuleProgressWithParentTimestamp(
      moduleId: string,
      participantId: string,
      depth = 1,
      maxDepth = 3,
      parentChain: string[] = [],
      filterTimestamp: number | null = null,
      eventCount = 0
    ): Promise<any[]> {
      if (depth > maxDepth) return []

      const module = await MongoClientDB.collection("activity")
        .aggregate([
          { $match: { _id: moduleId, spec: "lamp.module", _deleted: false } },
          {
            $lookup: {
              from: "activity",
              localField: "settings.activities",
              foreignField: "_id",
              as: "subActivities",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              spec: 1,
              settings: 1,
              "subActivities._id": 1,
              "subActivities.name": 1,
              "subActivities.spec": 1,
              "subActivities.description": 1,
              "subActivities.settings": 1,
            },
          },
        ])
        .next()

      if (!module) throw new Error(`Module with id ${moduleId} not found.`)

      const subIds = module.settings.activities ?? []

      // 3. Fetch sub-activity events after parent timestamp
      const getSubEventsAfter = async (ts: number) => {
        return MongoClientDB.collection("activity_event")
          .aggregate([
            {
              $match: {
                activity: { $in: subIds },
                _parent: participantId,
                ...(ts ? { timestamp: { $gt: ts } } : {}),
              },
            },
            { $group: { _id: "$activity", lastEvent: { $max: "$timestamp" } } },
          ])
          .toArray()
      }

      let subEvents: any[] = []
      if (filterTimestamp !== null) {
        subEvents = await getSubEventsAfter(filterTimestamp)
      }

      const eventMap = Object.fromEntries(
        subEvents.map((se: { _id: string; lastEvent: number }) => [se._id, se.lastEvent])
      )

      const currentChain = [...parentChain, module._id]

      // 4. Build subActivities (flatten modules/groups separately)
      const subActivities: any[] = []
      const extraEntries: any[] = []

      for (const sa of module.subActivities) {
        let isCompleted = false
        let startTime = undefined

        if (filterTimestamp !== null) {
          // Parent module is started, check sub-activity event
          if (sa.spec === "lamp.module") {
            // Check if submodule itself is started (has event after parent module event)
            const subModuleEvents = await MongoClientDB.collection("activity_event")
              .find({ activity: sa._id, _parent: participantId, timestamp: { $gt: filterTimestamp ?? 0 } })
              .sort({ timestamp: 1 })
              .toArray()

            let subModuleTimestamp: number | null = null
            if (subModuleEvents.length > 0) {
              subModuleTimestamp = subModuleEvents[0].timestamp
            }

            if (subModuleTimestamp !== null) {
              // Submodule is started, so check its sub-activities recursively
              const child = await getModuleProgressWithParentTimestamp(
                sa._id,
                participantId,
                depth + 1,
                maxDepth,
                currentChain,
                subModuleTimestamp // pass submodule's own timestamp
              )
              const childModule = child[0]

              isCompleted = !!childModule && childModule.isCompleted
              startTime = childModule?.subActivities?.find((sub: { isCompleted: any }) => sub.isCompleted)?.startTime
              if (child && child.length > 0) {
                child[0].parent = moduleId
              }
              subActivities.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parentString: currentChain.join(">"),
                parentModule: module._id,
                isCompleted,
                startTime,
              })

              extraEntries.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parent: module._id,
                settings: sa.settings,
                isHidden: true,
                subActivities: childModule?.subActivities ?? [],
                sequentialOrdering: !!sa.settings?.sequential_ordering,
                trackProgress: !!sa.settings?.track_progress,
              })
              if (child.length > 1) {
                extraEntries.push(...child.slice(1))
              }
            } else {
              // Submodule is NOT started, so all its sub-activities are not completed
              const child = await getModuleProgressWithParentTimestamp(
                sa._id,
                participantId,
                depth + 1,
                maxDepth,
                currentChain,
                null // force null so all submodule subactivities are also false
              )
              const childModule = child[0]

              // Overwrite all subActivities in childModule to isCompleted: false
              if (childModule && Array.isArray(childModule.subActivities)) {
                childModule.subActivities = childModule.subActivities.map((sub: any) => ({
                  ...sub,
                  isCompleted: false,
                  startTime: undefined,
                }))
              }
              if (child && child.length > 0) {
                child[0].parent = moduleId
              }

              subActivities.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                parentString: currentChain.join(">"),
                parentModule: module._id,
                isCompleted: false,
                startTime: undefined,
              })

              extraEntries.push({
                id: sa._id,
                name: sa.name,
                spec: sa.spec,
                settings: sa.settings,
                parent: module._id,
                isHidden: true,
                subActivities: childModule?.subActivities ?? [],
                sequentialOrdering: !!sa.settings?.sequential_ordering,
                trackProgress: !!sa.settings?.track_progress,
              })
              if (child.length > 1) {
                extraEntries.push(...child.slice(1))
              }
            }
          } else {
            // For non-module sub-activities, completed if event exists after parent module event
            const subEventTs = eventMap[sa._id]
            isCompleted = subEventTs !== undefined && subEventTs > filterTimestamp
            startTime = isCompleted ? new Date(subEventTs).toISOString() : undefined

            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted,
              startTime,
            })
          }
        } else {
          // Parent module is NOT started: recursively build submodules with all isCompleted: false
          if (sa.spec === "lamp.module") {
            const child = await getModuleProgressWithParentTimestamp(
              sa._id,
              participantId,
              depth + 1,
              maxDepth,
              currentChain,
              null // force null so all submodule subactivities are also false
            )
            const childModule = child[0]

            // Overwrite all subActivities in childModule to isCompleted: false
            if (childModule && Array.isArray(childModule.subActivities)) {
              childModule.subActivities = childModule.subActivities.map((sub: any) => ({
                ...sub,
                isCompleted: false,
                startTime: undefined,
              }))
            }
            if (child && child.length > 0) {
              child[0].parent = moduleId
            }

            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted: false,
              startTime: undefined,
            })

            extraEntries.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              settings: sa.settings,
              parent: module._id,
              isHidden: true,
              subActivities: childModule?.subActivities ?? [],
              sequentialOrdering: !!sa.settings?.sequential_ordering,
              trackProgress: !!sa.settings?.track_progress,
            })
            if (child.length > 1) {
              extraEntries.push(...child.slice(1))
            }
          } else {
            subActivities.push({
              id: sa._id,
              name: sa.name,
              spec: sa.spec,
              parentString: currentChain.join(">"),
              parentModule: module._id,
              isCompleted: false,
              startTime: undefined,
            })
          }
        }
      }

      // 5. Sequential ordering
      if (module.settings?.sequential_ordering) {
        let foundIncomplete = false
        for (let i = 0; i < subActivities.length; i++) {
          if (foundIncomplete) {
            subActivities[i].next = false
          } else if (!subActivities[i].isCompleted) {
            foundIncomplete = true
            subActivities[i].next = true
          } else {
            subActivities[i].next = false
          }
        }
      }

      // 6. Track progress
      if (module.settings?.track_progress) {
        for (let i = 0; i < subActivities.length; i++) {
          if (subActivities[i].spec === "lamp.module") {
            if (!!filterTimestamp) {
              module.progress = "started"
            } else {
              module.progress = "not_started"
            }
          } else {
            if (!subActivities[i].isCompleted) {
              subActivities[i].progress = "not_started"
            }
          }
        }
      }

      // 7. Final module result
      const moduleResult = {
        id: module._id,
        name: module.name,
        spec: module.spec,
        subActivities,
        level: depth + 1,
        trackProgress: !!module.settings?.track_progress,
        isCompleted: subActivities.length > 0 && subActivities.every((sa) => sa.isCompleted === true),
      }

      // If module just got completed, add a completion event
      if (moduleResult.isCompleted && eventCount === 1) {
        const ActivityEventRepository = new Repository().getActivityEventRepository()
        const startTime = filterTimestamp ?? Date.now()
        const now = Date.now()
        const duration = now - startTime
        // Prepare the event object
        const event = {
          activity: moduleId,
          timestamp: now,
          duration: duration,
          _parent: participantId,
          static_data: {},
          temporal_slices: [],
        }

        await ActivityEventRepository._insert(participantId, [event])
      }
      return [moduleResult, ...extraEntries]
    }

    return moduleData
  }

  private async _selectScheduledActivities(
    id: string | null,
    parent = false,
    ignore_binary = false,
    requestedDateStr?: string
  ): Promise<Activity[]> {
    let mainActivities = await MongoClientDB.collection("activity")
      .find({
        ...(parent
          ? id
            ? { _parent: id, _deleted: false }
            : { _deleted: false }
          : id
          ? { _id: id, _deleted: false }
          : { _deleted: false }),
        schedule: { $exists: true, $ne: null }, // basic filter
      })
      .project({
        name: 1,
        spec: 1,
        schedule: 1,
        _parent: 1,
        category: 1,
        settings: 1,
        timestamp: 1,
      })
      .sort({ timestamp: 1 })
      .toArray()

    mainActivities = mainActivities.filter((doc: any) => {
      const s = doc.schedule
      if (Array.isArray(s)) return s.length > 0 // exclude []
      if (s && typeof s === "object") return Object.keys(s).length > 0 // exclude {}
      if (typeof s === "string") return s.trim() !== "" // exclude empty strings
      return s != null // exclude null/undefined
    })
    const allActivityIds = [
      ...new Set(
        mainActivities
          .map((doc: any) => (Array.isArray(doc.settings?.activities) ? doc.settings.activities : []))
          .flat()
      ),
    ]

    const validActivities = await MongoClientDB.collection("activity")
      .find({ _id: { $in: allActivityIds }, _deleted: false })
      .project({ _id: 1 })
      .toArray()

    const validActivityIds = validActivities.map((doc: any) => doc._id)

    // Helper: normalize various inputs to local day (00:00)
    const toLocalDay = (val: any): Date => {
      try {
        if (typeof val === "string") {
          const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
          const n = Number(val)
          if (!isNaN(n)) return new Date(new Date(n).getFullYear(), new Date(n).getMonth(), new Date(n).getDate())
        }
        const d = val instanceof Date ? val : new Date(val)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      } catch {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
    }
    const dateKey = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

    const requestedDay =
      typeof requestedDateStr !== "undefined" && requestedDateStr !== null ? toLocalDay(requestedDateStr) : null
    const data = mainActivities.map((doc: any) => {
      if (Array.isArray(doc.settings?.activities)) {
        doc.settings.activities = doc.settings.activities.filter((id: any) => validActivityIds.includes(id))
      }
      // If a requested day is passed, filter per-schedule by start_date <= requested day (date-only)
      if (requestedDay && Array.isArray(doc.schedule)) {
        doc.schedule = doc.schedule.filter((s: any) => {
          const sd = toLocalDay(s?.start_date)
          return dateKey(sd) <= dateKey(requestedDay)
        })
      }
      return ignore_binary
        ? {
            id: doc._id,
            name: doc.name,
            spec: doc.spec,
            schedule: doc.schedule,
            _parent: doc._parent,
            category: doc.category,
          }
        : doc
    })
    return (data as any).map((x: any) => ({
      id: x._id,
      studyId: x._parent,
      ...x,
      _id: undefined,
      _parent: undefined,
      __v: undefined,
      _deleted: undefined,
      settings: ignore_binary ? undefined : x.settings,
      timestamp: undefined,
    }))
  }

  public async _getFeedDetails(participantId: string, dateMs: string, tzOffsetMinutes?: number): Promise<any> {
    const RepositoryInstance = new Repository()
    const ActivityEventRepository = RepositoryInstance.getActivityEventRepository()
    // Resolve date window (start of day to end of day) from string param (ms or YYYY-MM-DD)
    const parseRequestedDay = (val?: string): Date => {
      if (!val) {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      const num = Number(val)
      if (!isNaN(num)) {
        const d = new Date(num)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
      }
      const d = new Date(val)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const date = parseRequestedDay(dateMs)
    // Build UTC day window for the requested local calendar day
    const startTime = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    const endTime = startTime + 86400000
    // Get participant and study
    const participant: any = await MongoClientDB.collection("participant").findOne({ _id: participantId })
    if (!participant) return []
    const studyId = participant._parent

    // Fetch scheduled activities for the study
    const scheduledActivities = await this._selectScheduledActivities(studyId, true, true, dateMs)

    // Fetch events in an expanded window to account for timezone shifts (e.g., 05:00 local may be prev-day UTC)
    const expandedStart = startTime - 24 * 60 * 60 * 1000
    const expandedEnd = endTime + 24 * 60 * 60 * 1000
    const events: any[] = await ActivityEventRepository._select(
      participantId,
      true,
      undefined,
      expandedStart,
      expandedEnd,
      500
    )

    const getDayNumber = (d: Date) => new Date(d).getDay()

    const triweekly = [1, 3, 5]
    const biweekly = [2, 4]
    const currentDayNum = getDayNumber(date)

    const entryPromises: Promise<any>[] = []
    // Collect distinct days across the whole month for highlighting
    const monthDaysSet = new Set<string>()
    const pushMonthDay = (dLocal: Date) => {
      const y = dLocal.getFullYear()
      const m = dLocal.getMonth()
      const dd = dLocal.getDate()
      const iso = new Date(Date.UTC(y, m, dd, 0, 0, 0, 0)).toISOString()
      monthDaysSet.add(iso)
    }
    const monthFirstLocal = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthLastLocal = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    // Helper: extract HH:mm from configured value without applying timezone conversions
    const extractHM = (val: any): { hour: number; minute: number } => {
      try {
        if (typeof val === "string") {
          // Supports formats like "2025-11-06T15:30:00Z" or "15:30:00" or "15:30"
          const m = val.match(/(?:T|\s)?(\d{1,2}):(\d{2})/)
          if (m) return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) }
        }
        const d = val instanceof Date ? val : new Date(val)
        const h = d.getHours()
        const mm = isNaN(d.getMinutes()) ? 0 : d.getMinutes()
        return { hour: h, minute: mm }
      } catch (_) {
        return { hour: 0, minute: 0 }
      }
    }

    // Helper: normalize a date-like value to a calendar day (midnight local)
    // Prefer parsing pure date components (YYYY-MM-DD) to avoid TZ shifts when values include 'Z'
    const toLocalDay = (val: any): Date => {
      try {
        if (typeof val === "string") {
          const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (m) {
            const y = parseInt(m[1], 10)
            const mo = parseInt(m[2], 10) - 1
            const d = parseInt(m[3], 10)
            return new Date(y, mo, d)
          }
        }
        const d = val instanceof Date ? val : new Date(val)
        const nd = new Date(d)
        nd.setHours(0, 0, 0, 0)
        return nd
      } catch {
        const nd = new Date()
        nd.setHours(0, 0, 0, 0)
        return nd
      }
    }

    for (const feed of scheduledActivities || []) {
      const savedData = (events || []).filter((e) => e.activity === feed.id)
      const schedules = Array.isArray(feed.schedule) ? feed.schedule : []
      for (let sIdx = 0; sIdx < schedules.length; sIdx++) {
        const schedule = schedules[sIdx]
        const scheduleId =
          schedule && (schedule._id || schedule.id) ? String(schedule._id || schedule.id) : `${feed.id}:${sIdx}`
        const scheduleType = schedule?.repeat_interval
        const scheduleStartDate = toLocalDay(schedule.start_date.toString())
        // Include only if schedule start date (date-only) is on/before the requested day
        if (scheduleStartDate > date) continue
        const firstOfMonth = new Date(date)
        firstOfMonth.setDate(1)
        const sameMonth =
          new Date(scheduleStartDate).getMonth() === new Date(date).getMonth() &&
          new Date(scheduleStartDate).getFullYear() === new Date(date).getFullYear()
        let effectiveDate = new Date(date)
        if (firstOfMonth.getTime() <= new Date(scheduleStartDate).getTime() && sameMonth) {
          effectiveDate = new Date(scheduleStartDate)
        }
        effectiveDate.setHours(0, 0, 0, 0)
        const scheduleTime = schedule.time
        // Extract configured clock time without TZ conversion
        const { hour: schedHourLocal, minute: schedMinLocal } = extractHM(scheduleTime.toString())
        // tzOffsetMinutes = Date.getTimezoneOffset(). To get UTC instant for local HH:mm on this date:
        // UTC = UTC_midnight + (localMinutes + tzOffsetMinutes) * 60000
        const offset = typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0
        const dayStartUtcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
        const scheduledDateMs = dayStartUtcMs + (schedHourLocal * 60 + schedMinLocal + offset) * 60 * 1000

        const baseEntry = {
          activity: feed.id,
          // Display derived purely from configured hours/minutes (avoids timezone/DST display shifts)
          timeValue: (() => {
            const h = schedHourLocal
            const m = schedMinLocal
            const ampm = h >= 12 ? " pm" : " am"
            const h12 = h % 12 || 12
            const mm = m < 10 ? "0" + m : String(m)
            return `${h12}:${mm}${ampm}`
          })(),
          type: feed.spec,
          title: feed.name,
          activityData: JSON.parse(JSON.stringify({ ...feed, schedule: undefined })),
          group:
            feed.spec === "lamp.survey" || feed.spec === "lamp.group"
              ? "assess"
              : feed.spec === "lamp.tips"
              ? "learn"
              : "manage",
          clickable: false,
          completed: false,
          timestamp: scheduledDateMs,
          endTime: undefined as any,
          scheduleId,
          scheduleType,
        }

        // Clickability will be computed purely via epoch range; no day-equality guard to remain timezone-agnostic.

        // Build month-wide distinct days for highlighting
        const addMonthDaysForSchedule = () => {
          const startLocalDay = new Date(scheduleStartDate)
          startLocalDay.setHours(0, 0, 0, 0)
          const first = new Date(monthFirstLocal)
          first.setHours(0, 0, 0, 0)
          const last = new Date(monthLastLocal)
          last.setHours(23, 59, 59, 999)
          const sameMonth = (d: Date) => d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
          const within = (d: Date) => d.getTime() >= startLocalDay.getTime() && sameMonth(d)
          const weekdayStart = getDayNumber(scheduleStartDate)

          switch (schedule.repeat_interval) {
            case "none": {
              if (sameMonth(scheduleStartDate)) pushMonthDay(scheduleStartDate)
              break
            }
            case "daily":
            case "hourly":
            case "every3h":
            case "every6h":
            case "every12h": {
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d)) pushMonthDay(d)
              }
              break
            }
            case "weekly": {
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d) && getDayNumber(d) === weekdayStart) pushMonthDay(d)
              }
              break
            }
            case "triweekly":
            case "biweekly": {
              const type = schedule.repeat_interval === "triweekly" ? triweekly : biweekly
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d) && type.includes(getDayNumber(d))) pushMonthDay(d)
              }
              break
            }
            case "fortnightly": {
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (!within(d)) continue
                const sameWkDay = getDayNumber(d) === weekdayStart
                if (!sameWkDay) continue
                const diff = new Date(d).setHours(1, 0, 0, 0) - new Date(scheduleStartDate).setHours(1, 0, 0, 0)
                const weeksBetween = Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
                if (weeksBetween % 2 === 0) pushMonthDay(d)
              }
              break
            }
            case "monthly": {
              const targetDay = scheduleStartDate.getDate()
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d) && d.getDate() === targetDay) pushMonthDay(d)
              }
              break
            }
            case "bimonthly": {
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d) && (d.getDate() === 10 || d.getDate() === 20)) pushMonthDay(d)
              }
              break
            }
            case "custom": {
              for (let d = new Date(first); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
                if (within(d)) pushMonthDay(d)
              }
              break
            }
          }
        }

        const pushSingle = async (startTs: number, endTs?: number, timeOverride?: string) => {
          // Default the clickable window to the end of the requested day, not the original start_date.
          // This matches dashboard logic which treats items as clickable for the rest of the current day.
          const effectiveEndTs =
            typeof endTs === "number"
              ? endTs
              : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0)

          const completedStatus: boolean = savedData.some((ev) => {
            return ev.timestamp >= startTs && ev.timestamp < effectiveEndTs
          })

          // Clickable computed on server using exact UTC window
          const now = Date.now()
          const clickable = now >= startTs && now < effectiveEndTs
          return {
            ...baseEntry,
            // Keep configured schedule time unless overridden for slot-specific views (hourly/custom)
            timeValue: timeOverride ?? baseEntry.timeValue,
            timestamp: startTs,
            endTime: effectiveEndTs,
            completed: completedStatus,
            clickable,
          }
        }

        const windowStart = new Date(date)
        windowStart.setHours(0, 0, 0, 0)
        const windowEnd = new Date(date)
        windowEnd.setHours(23, 59, 0, 0)

        // Month highlight accrual
        addMonthDaysForSchedule()

        switch (schedule.repeat_interval) {
          case "daily": {
            entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "hourly":
          case "every3h":
          case "every6h":
          case "every12h": {
            const hourVal =
              schedule.repeat_interval === "hourly"
                ? 1
                : schedule.repeat_interval === "every3h"
                ? 3
                : schedule.repeat_interval === "every6h"
                ? 6
                : 12
            const stepMinutes = hourVal * 60
            const stepMs = stepMinutes * 60 * 1000
            const startOfDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)

            // Define the requested LOCAL day window in UTC using tzOffsetMinutes
            // localDayStartUtc = UTC_midnight + offset
            // localDayEndUtc   = UTC_midnight + (24h + offset)
            const localDayStartUtc = startOfDay + offset * 60 * 1000
            const localDayEndUtc = startOfDay + (24 * 60 + offset) * 60 * 1000
            const baseMinutesLocal = schedHourLocal * 60 + schedMinLocal
            // Start from the configured base local time (HH:mm) and iterate forward within the local day.
            // Do not backfill to 00:00; this preserves the intended anchor time (e.g., 02:00, then 03:00, ...).
            for (let k = 0; ; k++) {
              const minutesLocal = baseMinutesLocal + k * stepMinutes
              if (minutesLocal >= 24 * 60) break
              const tDerived = startOfDay + (minutesLocal + offset) * 60 * 1000
              // Include only slots that belong to the requested LOCAL calendar day
              if (tDerived >= localDayEndUtc) break
              if (tDerived < localDayStartUtc) continue
              const dispH24 = Math.floor(minutesLocal / 60) % 24
              const dispM = minutesLocal % 60
              const ampm = dispH24 >= 12 ? " pm" : " am"
              const h12 = dispH24 % 12 || 12
              const mm = dispM < 10 ? "0" + dispM : String(dispM)
              const slotTime = `${h12}:${mm}${ampm}`
              entryPromises.push(pushSingle(tDerived, tDerived + stepMs, slotTime))
            }
            break
          }
          case "weekly": {
            const dayNo = getDayNumber(scheduleStartDate)
            if (dayNo === currentDayNum) entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "triweekly":
          case "biweekly": {
            const type = schedule.repeat_interval === "triweekly" ? triweekly : biweekly
            if (type.indexOf(currentDayNum) > -1) entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "fortnightly": {
            // If current date is on the same weekday and weeks between is even
            const first = new Date(date)
            first.setHours(1, 0, 0, 0)
            const diff = first.getTime() - scheduleStartDate.getTime()
            const weeksBetween = Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
            const sameWeekday = getDayNumber(first) === getDayNumber(scheduleStartDate)
            if (weeksBetween % 2 === 0 && sameWeekday) entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "monthly": {
            if (date.getDate() === scheduleStartDate.getDate()) entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "bimonthly": {
            if ([10, 20].includes(date.getDate())) entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
          case "custom": {
            for (let i = 0; i < (schedule.custom_time || []).length; i++) {
              const tRaw = schedule.custom_time[i]
              const dayStartUtcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
              let startMs: number
              if (typeof tRaw === "number") {
                startMs = tRaw
              } else if (typeof tRaw === "string" && /[zZ]|[+\-]\d{2}:?\d{2}$/.test(tRaw)) {
                startMs = Date.parse(tRaw)
              } else {
                const { hour: ch, minute: cm } = extractHM(tRaw)
                startMs = dayStartUtcMs + (ch * 60 + cm + offset) * 60 * 1000
              }
              let endTs: number | undefined
              if (i + 1 < (schedule.custom_time || []).length) {
                const ntRaw = schedule.custom_time[i + 1]
                if (typeof ntRaw === "number") {
                  endTs = ntRaw
                } else if (typeof ntRaw === "string" && /[zZ]|[+\-]\d{2}:?\d{2}$/.test(ntRaw)) {
                  endTs = Date.parse(ntRaw)
                } else {
                  const { hour: nh, minute: nm } = extractHM(ntRaw)
                  endTs = dayStartUtcMs + (nh * 60 + nm + offset) * 60 * 1000
                }
              } else {
                endTs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0)
              }
              const { hour: ch, minute: cm } = extractHM(tRaw)
              const displayTime = (() => {
                const h = ch
                const m = cm
                const ampm = h >= 12 ? " pm" : " am"
                const h12 = h % 12 || 12
                const mm = m < 10 ? "0" + m : String(m)
                return `${h12}:${mm}${ampm}`
              })()
              entryPromises.push(pushSingle(startMs, endTs, displayTime))
            }
            break
          }
          case "none": {
            if (date.toLocaleDateString() === scheduleStartDate.toLocaleDateString())
              entryPromises.push(pushSingle(scheduledDateMs))
            break
          }
        }
      }
    }

    const results = await Promise.all(entryPromises)
    // Deduplicate entries by scheduleId + timeValue to prevent duplicate slots per schedule
    const seen = new Set<string>()
    const deduped = [] as any[]
    for (const it of results) {
      const key = `${it.scheduleId}|${it.timeValue}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(it)
      }
    }
    const toMinutes = (tv?: string): number => {
      if (typeof tv !== "string") return Number.MAX_SAFE_INTEGER
      const m = tv.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
      if (!m) return Number.MAX_SAFE_INTEGER
      let h = parseInt(m[1], 10)
      const min = parseInt(m[2], 10)
      const ampm = m[3].toLowerCase()
      if (ampm === "pm" && h !== 12) h += 12
      if (ampm === "am" && h === 12) h = 0
      return h * 60 + min
    }
    deduped.sort((a, b) => {
      const ma = toMinutes(a.timeValue)
      const mb = toMinutes(b.timeValue)
      if (ma !== mb) return ma - mb
      return a.timestamp - b.timestamp
    })
    const distinctDays = Array.from(monthDaysSet.values())
    return { items: deduped, distinctDays }
  }
}
