import { Database } from "../Bootstrap"
import { DynamicAttachment } from "../../model"
//import { ScriptRunner } from "../../utils"
import { TypeInterface } from "../interface/RepositoryInterface"
import { Repository } from "../../repository/Bootstrap"
// FIXME: Support application/json;indent=:spaces format mime type!

export class TypeRepository implements TypeInterface {
  public async _parent(type_id: string): Promise<{}> {
    const result: any = {} // obj['#parent'] === [null, undefined] -> top-level object
    const repo = new Repository()
    const TypeRepository = repo.getTypeRepository()
    for (const parent_type of await TypeRepository._parent_type(type_id))
      result[parent_type] = await TypeRepository._parent_id(type_id, parent_type)
    return result
  }

  public async _self_type(type_id: string): Promise<string> {
    try {
      await Database.use("participant").head(type_id)
      return "Participant"
    } catch (e) {}
    try {
      await Database.use("researcher").head(type_id)
      return "Researcher"
    } catch (e) {}
    try {
      await Database.use("study").head(type_id)
      return "Study"
    } catch (e) {}
    try {
      await Database.use("activity").head(type_id)
      return "Activity"
    } catch (e) {}
    try {
      await Database.use("sensor").head(type_id)
      return "Sensor"
    } catch (e) {}
    return "__broken_id__"
  }

  public async _owner(type_id: string): Promise<string | null> {
    try {
      return ((await Database.use("participant").get(type_id)) as any)["#parent"]
    } catch (e) {}
    try {
      await Database.use("researcher").head(type_id)
      return null
    } catch (e) {}
    try {
      return ((await Database.use("study").get(type_id)) as any)["#parent"]
    } catch (e) {}
    try {
      return ((await Database.use("activity").get(type_id)) as any)["#parent"]
    } catch (e) {}
    try {
      return ((await Database.use("sensor").get(type_id)) as any)["#parent"]
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
    const existing = (
      await Database.use("tag").find({
        selector: { "#parent": type_id, type, key },
        limit: 1,
      })
    ).docs
    if (existing.length === 0 && !deletion) {
      // CREATE
      try {
        await Database.use("tag").insert({
          "#parent": type_id,
          type,
          key,
          value,
        } as any)
      } catch (e) {
        console.error(e)
        throw new Error("500.creation-or-update-failed")
      }
    } else if (existing.length > 0 && !deletion) {
      // UPDATE
      try {
        const data = await Database.use("tag").bulk({
          docs: [{ ...existing[0], value }],
        })
        if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
      } catch (e) {
        console.error(e)
        throw new Error("400.update-failed")
      }
    } else {
      // DELETE
      try {
        const data = await Database.use("tag").bulk({
          docs: [{ ...existing[0], _deleted: true }],
        })
        if (data.filter((x: any) => !!x.error).length > 0) throw new Error()
      } catch (e) {
        console.error(e)
        throw new Error("400.deletion-failed")
      }
    }
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
      ...parents.map((pid) => ({ "#parent": pid, type: type_id, key: attachment_key })),
      // Implicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ "#parent": pid, type: self_type, key: attachment_key })),
      // Explicit self-ownership.
      { "#parent": type_id, type: type_id, key: attachment_key },
      // Implicit self-ownership.
      { "#parent": type_id, type: "me", key: attachment_key },
    ]

    // Following greatest-to-least priority, see if the Tag exists. We do this because:
    // (1) Following priority order allows us to avoid searching the database after we find the
    //     Tag we're looking for that applies with the greatest priority.
    // (2) The CouchDB Mango Query API is NOT OPTIMIZED for $or queries that consist of
    //     multiple keys per-subquery; the difference is almost ~7sec vs. ~150ms.
    for (const condition of conditions) {
      try {
        const value = await Database.use("tag").find({ selector: condition as any, limit: 1 })
        if (value.docs.length > 0) return value.docs.map((x: any) => x.value as any)[0]
      } catch (error) {
        console.error(error, `Failed to search Tag index for ${condition["#parent"]}:${condition.type}.`)
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

    // All possible conditions to retreive Tags, ordered greatest-to-least priority.
    // Note: We MUST add a "key" selector to force CouchDB to use the right Mango index.
    const conditions = [
      // Explicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ "#parent": pid, type: type_id, key: { $gt: null } })),
      // Implicit parent-ownership. (Ordered greatest-to-least ancestor.)
      ...parents.map((pid) => ({ "#parent": pid, type: self_type, key: { $gt: null } })),
      // Explicit self-ownership.
      { "#parent": type_id, type: type_id, key: { $gt: null } },
      // Implicit self-ownership.
      { "#parent": type_id, type: "me", key: { $gt: null } },
    ]

    // Following greatest-to-least priority, see if the Tag exists. We do this because:
    // (1) Following priority order allows us to avoid searching the database after we find the
    //     Tag we're looking for that applies with the greatest priority.
    // (2) The CouchDB Mango Query API is NOT OPTIMIZED for $or queries that consist of
    //     multiple keys per-subquery; the difference is almost ~7sec vs. ~150ms.
    let all_keys: string[] = []
    for (const condition of conditions) {
      try {
        const value = await Database.use("tag").find({
          selector: condition as any,
          limit: 2_147_483_647 /* 32-bit INT_MAX */,
        })
        console.dir(value)
        all_keys = [...all_keys, ...value.docs.map((x: any) => x.key as any)]
      } catch (error) {
        console.error(error, `Failed to search Tag index for ${condition["#parent"]}:${condition.type}.`)
      }
    }

    // Return all the Tag keys we found; converting to a Set and back to an Array
    // removes any duplicates (i.e. parent-specified Tag taking precedence over self-Tag).
    // Else, if no such Tags were found, return an error (for legacy purposes).
    if (all_keys.length > 0) return [...new Set(all_keys)]
    else throw new Error("404.object-not-found")
  }

  /*public async _invoke(attachment: DynamicAttachment, context: any): Promise<any | undefined> {
    if ((attachment.contents || "").trim().length === 0) return undefined
    // Select script runner for the right language...
    let runner: ScriptRunner
    switch (attachment.language) {
      case "rscript":
        runner = new ScriptRunner.R()
        break
      case "python":
        runner = new ScriptRunner.Py()
        break
      case "javascript":
        runner = new ScriptRunner.JS()
        break
      case "bash":
        runner = new ScriptRunner.Bash()
        break
      default:
        throw new Error("400.invalid-script-runner")
    }
    // Execute script.
    return await runner.execute(attachment.contents!, attachment.requirements!.join(","), context)
  }*/

  /*public  async _process_triggers(): Promise<void> {
    // FIXME: THIS FUNCTION IS DEPRECATED/OUT OF DATE/DISABLED (!!!)
    console.log("Processing accumulated attachment triggers...")

    // Request the set of all updates.
    const accumulated_set = (
      await SQL!.request().query(`
			SELECT 
				Type, ID, Subtype, 
				DATEDIFF_BIG(MS, '1970-01-01', LastUpdate) AS LastUpdate, 
				Users.StudyId AS _SID,
				Users.AdminID AS _AID
			FROM LAMP_Aux.dbo.UpdateCounter
			LEFT JOIN LAMP.dbo.Users
				ON Type = 'Participant' AND Users.UserID = ID
			ORDER BY LastUpdate DESC;
		`)
    ).recordset.map((x: any) => ({
      ...x,
      _id:
        x.Type === "Participant"
          ? Participant_pack_id({ study_id: x._SID }) // FIXME: Decrypt(<string>x._SID)
          : Researcher_pack_id({ admin_id: x.ID }),
      _admin:
        x.Type === "Participant" ? Researcher_pack_id({ admin_id: x._AID }) : Researcher_pack_id({ admin_id: x.ID }),
    }))
    const ax_set1 = accumulated_set.map((x: any) => x._id)
    const ax_set2 = accumulated_set.map((x: any) => x._admin)

    // Request the set of event masks prepared.
    const registered_set = (
      await SQL!.request().query(`
			SELECT * FROM LAMP_Aux.dbo.OOLAttachmentLinker; 
		`)
    ).recordset // TODO: SELECT * FROM LAMP_Aux.dbo.OOLTriggerSet;

    // Diff the masks against all updates.
    let working_set = registered_set.filter(
      (x: any) =>
        // Attachment from self -> self.
        (x.ChildObjectType === "me" && ax_set1.indexOf(x.ObjectID) >= 0) ||
        // Attachment from self -> children of type Participant
        (x.ChildObjectType === "Participant" && ax_set2.indexOf(x.ObjectID) >= 0) ||
        // Attachment from self -> specific child Participant matching an ID
        accumulated_set.find((y: any) => y._id === x.ChildObjectType && y._admin === x.ObjectID) !== undefined
    )

    // Completely delete all updates; we're done collecting the working set.
    // TODO: Maybe don't delete before execution?
    const result = await SQL!.request().query(`
            DELETE FROM LAMP_Aux.dbo.UpdateCounter;
		`)
    console.log("Resolved " + JSON.stringify(result.recordset) + " events.")

    // Duplicate the working set into specific entries.
    working_set = working_set
      .map((x: any) => {
        const script_type = x.ScriptType.startsWith("{")
          ? JSON.parse(x.ScriptType)
          : { triggers: [], language: x.ScriptType }

        const obj = new DynamicAttachment()
        obj.key = x.AttachmentKey
        obj.from = x.ObjectID
        obj.to = x.ChildObjectType
        obj.triggers = script_type.triggers
        obj.language = script_type.language
        obj.contents = x.ScriptContents
        obj.requirements = JSON.parse(x.ReqPackages)
        return obj
      })
      .map((x: any) => {
        // Apply a subgroup transformation only if we're targetting all
        // child resources of a type (i.e. 'Participant').
        if (x.to === "Participant")
          return accumulated_set
            .filter((y: any) => y.Type === "Participant" && y._admin === x.from && y._id !== y._admin)
            .map((y: any) => ({ ...x, to: y._id }))
        return [{ ...x, to: x.from as string }]
      })
    ;([] as any[]).concat(...working_set).forEach(async (x) =>
      TypeRepository._invoke(x, {
        // The security context originator for the script
        // with a magic placeholder to indicate to the LAMP server
        // that the script's API requests are pre-authenticated.
        token: await CredentialRepository._packCosignerData(x.from, x.to),

        // What object was this automation run for on behalf of an agent?
        object: {
          id: x.to,
          type: TypeRepository._self_type(x.to),
        },

        // Currently meaningless but does signify what caused the IA to run.
        event: ["ActivityEvent", "SensorEvent"],
      })
        .then((y) => {
          TypeRepository._set("a", x.to, x.from as string, x.key + "/output", y)
        })
        .catch((err) => {
          TypeRepository._set(
            "a",
            x.to,
            x.from as string,
            x.key + "/output",
            JSON.stringify({ output: null, logs: err })
          )
        })
    )
    // TODO: This is for a single item only;
    const type_id = ""
    const attachments: DynamicAttachment[] = await Promise.all(
      (await TypeRepository._list("b", type_id as string)).map(
        async (x) => await TypeRepository._get("b", type_id as string, x)
      )
    )
    attachments
      .filter((x) => !!x.triggers && x.triggers.length > 0)
      .forEach((x) =>
        TypeRepository._invoke(x, null).then((y: any) => {
          TypeRepository._set("a", x.to!, <string>x.from!, x.key! + "/output")
        })
      )
  }*/
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
      const obj: any = await Database.use("study").get(id)
      return obj["#parent"]
    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Participant_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await Database.use("participant").get(id)
      return obj["#parent"]
    case "Researcher":
      obj = await Database.use("participant").get(id)
      obj = await Database.use("study").get(obj["#parent"])
      return obj["#parent"]
    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Activity_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await Database.use("activity").get(id)
      return obj["#parent"]
    case "Researcher":
      obj = await Database.use("activity").get(id)
      obj = await Database.use("study").get(obj["#parent"])
      return obj["#parent"]
    default:
      throw new Error("400.invalid-identifier")
  }
}
async function Sensor_parent_id(id: string, type: string): Promise<string | undefined> {
  let obj: any
  switch (type) {
    case "Study":
      obj = await Database.use("sensor").get(id)
      return obj["#parent"]
    case "Researcher":
      obj = await Database.use("sensor").get(id)
      obj = await Database.use("study").get(obj["#parent"])
      return obj["#parent"]
    default:
      throw new Error("400.invalid-identifier")
  }
}
