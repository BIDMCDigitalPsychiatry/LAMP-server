import { TypeRepository } from "../repository/TypeRepository"
import { CredentialRepository } from "../repository/CredentialRepository"

export function SecurityContext(): Promise<{ type: string; id: string }> {
  return Promise.resolve({ type: "", id: "" })
}

export function ActionContext(): Promise<{ type: string; id: string }> {
  return Promise.resolve({ type: "", id: "" })
}

export async function _verify(
  authHeader: string | undefined,
  type: Array<"self" | "sibling" | "parent"> /* 'root' = [] */,
  auth_value?: string
): Promise<string> {
  // Get the authorization components from the header and tokenize them.
  // TODO: ignoring the other authorization location stuff for now...
  const [authStr, cosignData] = CredentialRepository._unpackCosignerData((authHeader ?? "").replace("Basic", "").trim())
  const auth = (authStr.indexOf(":") >= 0 ? authStr : Buffer.from(authStr, "base64").toString()).split(":", 2)
  // If no authorization is provided, ask for something.
  if (auth.length !== 2 || !auth[1]) throw new Error("401.missing-credentials")

  // Handle basic no credentials and root auth required cases.
  let sub_auth_value = undefined
  if (auth_value === undefined && !["root", "admin"].includes(auth[0])) {
    throw new Error("403.security-context-out-of-scope")
  } else if (["root", "admin"].includes(auth[0]) && !(await CredentialRepository._adminCredential(auth[1]))) {
    throw new Error("403.invalid-credentials")
  } else if (!(["root", "admin"].includes(auth[0]) && (await CredentialRepository._adminCredential(auth[1])))) {
    let from, to
    if (!!cosignData) {
      from = cosignData.identity.from
      to = auth_value
      // Patch in the special-cased "me" to the actual authenticated credential.
      if (auth_value /* to */ === "me") sub_auth_value = to = cosignData.identity.to
    } else {
      from = auth[0]
      to = auth_value
      auth[0] = from = await CredentialRepository._find(auth[0], auth[1] || "*" /* FIXME: this forces password match */)
      // Patch in the special-cased "me" to the actual authenticated credential.
      if (to === "me") sub_auth_value = to = auth[0]
    } // FIXME: R vs P?

    // eslint-disable-next-line
    /*console.dir({ type, from, to, match: [ from === to,
      (await TypeRepository._owner(from ?? "")) === (await TypeRepository._owner(to ?? "")),
      Object.values(await TypeRepository._parent(to ?? "")).includes(from ?? ""),
    ]})//*/

    // Handle whether we require the parameter to be [[[self], a sibling], or a parent].
    if (
      /* Check if `to` and `from` are the same object. */
      !(type.includes("self") ? from === to : false) &&
      /* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
      !(type.includes("sibling")
        ? (await TypeRepository._owner(from ?? "")) === (await TypeRepository._owner(to || ""))
        : false) &&
      /* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
      !(type.includes("parent") ? Object.values(await TypeRepository._parent(to ?? "")).includes(from ?? "") : false)
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
