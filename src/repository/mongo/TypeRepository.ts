import { DynamicAttachment } from "../../model"
//import { ScriptRunner } from "../../utils"
import { Repository } from "../../repository/Bootstrap"
import { TypeInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"

// FIXME: Support application/json;indent=:spaces format mime type!

export class TypeRepository implements TypeInterface {
  public async _parent(type_id: string): Promise<{}> {
    const result: any = {} // obj['_parent'] === [null, undefined] -> top-level object
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    for (const parent_type of await TypeRepository._parent_type(type_id))
      result[parent_type] = await TypeRepository._parent_id(type_id, parent_type)
    return result
  }

  public async _self_type(type_id: string): Promise<string> {
    try {
      const data: any = await (MongoClientDB.collection("participant").findOne({
        _deleted: false,
        _id: type_id,
      }) as any)
      if (null !== data) return "Participant"
    } catch (e) {}
    try {
      const data: any = await (MongoClientDB.collection("researcher").findOne({ _deleted: false, _id: type_id }) as any)
      if (null !== data) return "Researcher"
    } catch (e) {}
    try {
      const data: any = await (MongoClientDB.collection("study").findOne({ _deleted: false, _id: type_id }) as any)
      if (null !== data) return "Study"
    } catch (e) {}
    try {
      const data: any = await (MongoClientDB.collection("activity").findOne({ _deleted: false, _id: type_id }) as any)
      if (null !== data) return "Activity"
    } catch (e) {}
    try {
      const data: any = await (MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: type_id }) as any)
      if (null !== data) return "Sensor"
    } catch (e) {}
    return "__broken_id__"
  }

  public async _owner(type_id: string): Promise<string | null> {
    try {
      return ((await MongoClientDB.collection("participant").findOne({ _deleted: false, _id: type_id })) as any)._parent
    } catch (e) {}
    try {
      const data: any = await (MongoClientDB.collection("researcher").findOne({ _deleted: false, _id: type_id }) as any)
      if (null !== data) return null
    } catch (e) {}
    try {
      return ((await MongoClientDB.collection("study").findOne({ _deleted: false, _id: type_id })) as any)._parent
    } catch (e) {}
    try {
      return ((await MongoClientDB.collection("activity").findOne({ _deleted: false, _id: type_id })) as any)._parent
    } catch (e) {}
    try {
      return ((await MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: type_id })) as any)._parent
    } catch (e) {}
    return null
  }

  public async _parent_type(type_id: string): Promise<string[]> {
    const parent_types: { [type: string]: string[] } = {
      Researcher: [],
      Study: ["Researcher"],
      Participant: ["Study", "Researcher"],
      Activity: ["Study", "Researcher"],
      Sensor: ["Study", "Researcher"],
    }
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    return parent_types[await TypeRepository._self_type(type_id)]
  }

  public async _parent_id(type_id: string, type: string): Promise<string> {
    const self_type: { [type: string]: Function } = {
      Researcher: Researcher_parent_id,
      Study: Study_parent_id,
      Participant: Participant_parent_id,
      Activity: Activity_parent_id,
      Sensor: Sensor_parent_id,
    }
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    return await (self_type[await TypeRepository._self_type(type_id)] as any)(type_id, type)
  }

  public async _set(mode: any, type: string, type_id: string, key: string, value?: any): Promise<{}> {
    const deletion = value === undefined || value === null
    const output = await MongoClientDB.collection("tag").findOneAndUpdate(
      { _parent: type_id, type: type, key: key },
      {
        $set: {
          _deleted: deletion,
          value: deletion ? null : JSON.stringify(value),
        },
        $setOnInsert: {
          _parent: type_id,
          type: type,
          key: key,
        },
      },
      { upsert: true, maxTimeMS: 60000 }
    )
    return {}
  }

  public async _get(mode: any, type_id: string, attachment_key: string): Promise<any | undefined> {
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    const self_type = (type_id ===null) ? undefined : await TypeRepository._self_type(type_id)
    const parents = (type_id ===null) ? new Array : Object.values(await TypeRepository._parent(type_id)).reverse() 
    // All possible conditions to retreive Tags, ordered greatest-to-least priority.
    const conditions = [
      // Explicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ _deleted: false, _parent: pid, type: type_id, key: attachment_key })),
      // Implicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ _deleted: false, _parent: pid, type: self_type, key: attachment_key })),
      // Explicit self-ownership.
      { _deleted: false, _parent: type_id, type: type_id, key: attachment_key },
      // Implicit self-ownership.
      { _deleted: false, _parent: type_id, type: "me", key: attachment_key },
    ]

    // Following greatest-to-least priority, see if the Tag exists. We do this because:
    // (1) Following priority order allows us to avoid searching the database after we find the
    //     Tag we're looking for that applies with the greatest priority.
    // (2) The CouchDB Mango Query API is NOT OPTIMIZED for $or queries that consist of
    //     multiple keys per-subquery; the difference is almost ~7sec vs. ~150ms.
    for (const condition of conditions) {
      try {
        const value = await MongoClientDB.collection("tag").find(condition).limit(1).maxTimeMS(60000).toArray()        
        if (value.length > 0) return value.map((x: any) => JSON.parse(x.value))[0]
      } catch (error) {
        console.error(error, `Failed to search Tag index for ${condition._parent}:${condition.type}.`)
      }
    }

    // No such Tag was found, so return an error (for legacy purposes).
    throw new Error("404.object-not-found")
  }

  public async _list(mode: any, type_id: string): Promise<string[]> {
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    const self_type = (type_id ===null) ? undefined : await TypeRepository._self_type(type_id)
    const parents = (type_id ===null) ? new Array : Object.values(await TypeRepository._parent(type_id)).reverse()   
    let conditions: any[] = []
    conditions = [
      // Explicit parent-ownership. (Ordered greatest-to-least ancestor.)

      ...parents.map((pid) => ({ _deleted: false, _parent: pid, type: type_id, key: { $ne: null } })),
      // Implicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ _deleted: false, _parent: pid, type: self_type, key: { $ne: null } })),
      // Explicit self-ownership.
      { _deleted: false, _parent: type_id, type: type_id, key: { $ne: null } },
      // Implicit self-ownership.
      { _deleted: false, _parent: type_id, type: "me", key: { $ne: null } },
    ]

    // Following greatest-to-least priority, see if the Tag exists. We do this because:
    // (1) Following priority order allows us to avoid searching the database after we find the
    //     Tag we're looking for that applies with the greatest priority.
    // (2) The CouchDB Mango Query API is NOT OPTIMIZED for $or queries that consist of
    //     multiple keys per-subquery; the difference is almost ~7sec vs. ~150ms.
    let all_keys: string[] = []
    for (const condition of conditions) {
      try {
        const value = await MongoClientDB.collection("tag")
          .find(condition)
          .limit(2_147_483_647)
          .maxTimeMS(60000)
          .toArray()
        all_keys = [...all_keys, ...value.map((x: any) => x.key as any)]
      } catch (error) {
        console.error(error, `Failed to search Tag index for ${condition._parent}:${condition.type}.`)
      }
    }

    // Return all the Tag keys we found; converting to a Set and back to an Array
    // removes any duplicates (i.e. parent-specified Tag taking precedence over self-Tag).
    // Else, if no such Tags were found, return an error (for legacy purposes).
    if (all_keys.length > 0) return [...new Set(all_keys)]
    else throw new Error("404.object-not-found")
  }
}

async function Researcher_parent_id(id: string, type: string): Promise<string | undefined> {
  switch (type) {
    default:
      return undefined
    // throw new Error('400.invalid-identifier')
  }
}
async function Study_parent_id(id: string, type: string): Promise<string | undefined> {
  switch (type) {
    case "Researcher":
      const obj: any = await MongoClientDB.collection("study").findOne({ _deleted: false, _id: id })
      return obj._parent

    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Participant_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await MongoClientDB.collection("participant").findOne({ _deleted: false, _id: id })
      return obj._parent

    case "Researcher":
      obj = await MongoClientDB.collection("participant").findOne({ _deleted: false, _id: id })
      obj = await MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })
      return obj._parent

    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Activity_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await MongoClientDB.collection("activity").findOne({ _deleted: false, _id: id })
      return obj._parent

    case "Researcher":
      obj = await MongoClientDB.collection("activity").findOne({ _deleted: false, _id: id })
      obj = await MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })
      return obj._parent

    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Sensor_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: id })
      return obj._parent

    case "Researcher":
      obj = await MongoClientDB.collection("sensor").findOne({ _deleted: false, _id: id })
      obj = await MongoClientDB.collection("study").findOne({ _deleted: false, _id: obj._parent })
      return obj._parent

    default:
      throw new Error("400.invalid-identifier")
  }
}
