import crypto from "crypto"
import { Database, SQL, Encrypt, Decrypt } from "../app"
import { ResearcherRepository } from "../repository/ResearcherRepository"
import { TypeRepository } from "../repository/TypeRepository"
import { CredentialRepository } from "../repository/CredentialRepository"

export function SecurityContext(): Promise<{ type: string; id: string }> {
  return Promise.resolve({ type: "", id: "" })
}

export function ActionContext(): Promise<{ type: string; id: string }> {
  return Promise.resolve({ type: "", id: "" })
}

let rootPassword: string

export async function _verify(
  authHeader: string | undefined,
  type: Array<"self" | "sibling" | "parent"> /* 'root' = [] */,
  auth_value?: string
): Promise<string> {
  // Lazy evaluation of root password if we haven't already loaded it.
  if (rootPassword === undefined) {
    try {
      rootPassword = ((await Database.use("root").get("#master_config")) as any).data.password
    } catch (e) {
      const random = crypto.randomBytes(32).toString("hex")
      console.dir(`Because no master configuration could be located, a temporary root password \
was generated for this session.`)
      console.table({ "Root Password": random })
      rootPassword = Encrypt(random, "AES256") as string
    }
  }

  // Get the authorization components from the header and tokenize them.
  // TODO: ignoring the other authorization location stuff for now...
  let authStr = (authHeader ?? "").replace("Basic", "").trim()
  const cosignData = authStr.startsWith("LAMP") ? JSON.parse(Decrypt(authStr.slice(4)) || "") : undefined
  if (cosignData !== undefined)
    // FIXME !?
    authStr = Object.values(cosignData.cosigner).join(":")
  else authStr = authStr.indexOf(":") >= 0 ? authStr : Buffer.from(authStr, "base64").toString()
  const auth = authStr.split(":", 2)

  // If no authorization is provided, ask for something.
  if (auth.length !== 2 || !auth[1]) {
    throw new Error("401.missing-credentials")
  }

  // Handle basic no credentials and root auth required cases.
  let sub_auth_value = undefined
  if (!auth_value && !["root", "admin"].includes(auth[0])) {
    throw new Error("403.security-context-requires-root-scope")
  } else if (["root", "admin"].includes(auth[0]) && auth[1] !== Decrypt(rootPassword, "AES256")) {
    throw new Error("403.invalid-credentials")
  } else if (!(["root", "admin"].includes(auth[0]) && auth[1] === Decrypt(rootPassword, "AES256"))) {
    let from = auth[0],
      to = auth_value

    if (TypeRepository._self_type(from) === "Participant") {
      // Authenticate as a Participant.
      const result = (
        await SQL!.request().query(`
	            SELECT Password 
	            FROM Users
	            WHERE IsDeleted = 0 AND StudyId = '${Encrypt(from)}';
			`)
      ).recordset
      if (result.length === 0 || Decrypt(result[0]["Password"], "AES256") !== auth[1])
        throw new Error("403.invalid-credentials") /* authorization-failed */
    } else if (TypeRepository._self_type(from) === "Researcher") {
      // Authenticate as a Researcher.
      const result = (
        await SQL!.request().query(`
	            SELECT AdminID, Password 
	            FROM Admin
	            WHERE IsDeleted = 0 AND AdminID = '${ResearcherRepository._unpack_id(from).admin_id}';
			`)
      ).recordset
      if (result.length === 0 || Decrypt(result[0]["Password"], "AES256") !== auth[1])
        throw new Error("403.invalid-credentials")
    } else {
      auth[0] = from = await CredentialRepository._find(auth[0], auth[1] || "*" /* FIXME: force password matching */)
    }

    // Patch in the special-cased "me" to the actual authenticated credential.
    if (to === "me") sub_auth_value = to = auth[0]
    // FIXME: R vs P?

    // Handle whether we require the parameter to be [[[self], a sibling], or a parent].
    if (
      /* Check if `to` and `from` are the same object. */
      type.includes("self") &&
      from !== to &&
      /* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
      type.includes("sibling") &&
      TypeRepository._parent_type(from || "").indexOf(TypeRepository._parent_type(to || "")[0]) < 0 &&
      /* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
      type.includes("parent") &&
      from !== (await TypeRepository._parent_id(to || "", TypeRepository._self_type(from || "")))
    ) {
      /* We've given the authorization enough chances... */
      throw new Error("403.security-context-out-of-scope")
    }
  }

  // FIXME: clean this up...
  // Handle the above normal login cases if we're cosigned by root.
  if (!!cosignData) {
    const from = cosignData.identity.from
    let to = auth_value

    // Patch in the special-cased "me" to the actual authenticated credential.
    if (auth_value /* to */ === "me") sub_auth_value = to = cosignData.identity.to
    // FIXME: R vs P?

    // Handle whether we require the parameter to be [[[self], a sibling], or a parent].
    if (
      /* Check if `to` and `from` are the same object. */
      type.includes("self") &&
      from !== to &&
      /* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
      type.includes("sibling") &&
      TypeRepository._parent_type(from || "").indexOf(TypeRepository._parent_type(to || "")[0]) < 0 &&
      /* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
      type.includes("parent") &&
      from !== (await TypeRepository._parent_id(to || "", TypeRepository._self_type(from || "")))
    ) {
      /* We've given the authorization enough chances... */
      throw new Error("403.security-context-out-of-scope")
    }
  }

  // There shouldn't be any "me" anymore -- unless we're root.
  if (cosignData === undefined && sub_auth_value === undefined && auth_value /* to */ === "me")
    throw new Error("400.context-substitution-failed")

  return sub_auth_value || auth_value
}
