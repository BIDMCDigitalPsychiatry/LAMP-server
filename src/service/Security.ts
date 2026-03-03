import { Repository, Decrypt } from "../repository/Bootstrap"
import { jwtVerify } from "jose"
import { MongoClientDB } from "../repository/Bootstrap"

// The AuthSubject type represents an already-validated authorization that can be reused.
type AuthSubject = { origin: string; access_key: string; secret_key: string; _id: string }
const JWT_SECRET = process.env.SECRET_KEY as string
// Converts an Authorization header (`Authorization: Basic btoa('user:pass')` to an object.
// If components are missing, throw a missing credentials error (HTTP 401).
// Otherwise, locate the Credential or throw an error if not found/invalid.
export async function _createAuthSubject(authHeader: string | undefined): Promise<AuthSubject> {
  const CredentialRepository = new Repository().getCredentialRepository()
  if (authHeader === undefined) throw new Error("401.missing-credentials")
  const authStr = authHeader.replace("Basic", "").trim()
  const auth = (authStr.indexOf(":") >= 0 ? authStr : Buffer.from(authStr, "base64").toString()).split(":", 2)
  if (auth.length !== 2 || !auth[1]) throw new Error("401.missing-credentials")
  let origin = await CredentialRepository._find(auth[0], auth[1] || "*" /* FIXME: this forces password match */)
  return {
    origin: origin,
    access_key: auth[0],
    secret_key: auth[1],
    _id: auth[2],
  }
}

// Simple Role-Based-Access-Control (RBAC) to answer: Can (subject) (verb) (object)?
// The (subject) is indicated as the Authorization header of the HTTP call and passed in here.
// The (verb) is indicated in the function that calls _verify (ie. Activity.create).
// The (object) is provided in thhe URL (usually) and passed in here (either string ID or null for "root").
// - Additionally, the "type" array allows restricting hierarchical ownership of subject -> object.
//   Use [] (empty array) to indicate that ONLY root credentials are allowed to (verb).
export async function _verify(
  authSubject: AuthSubject | string | undefined,
  authType: Array<"self" | "sibling" | "parent"> /* 'root' = [] */,
  authObject?: string | null
): Promise<string> {
  const TypeRepository = new Repository().getTypeRepository()
  if (authSubject === undefined || typeof authSubject === "string") {
    if (authSubject?.toString()?.includes("Bearer")) {
      authSubject = await _createAuthSubjectFromToken(authSubject)
    } else {
      authSubject = await _createAuthSubject(authSubject)
    }
  }

  const response: any = {}
  // If an actual AuthSubject was not provided, create one first.

  const isRoot = authSubject.origin === null

  response.origin = authSubject.origin
  // Patch in the special-cased "me" to the actual authenticated credential.
  // Root credentials (origin is null) are not allowed to substitute the "me" value.
  if (authObject === "me" && !isRoot) {
    authObject = authSubject.origin
    response.id = authSubject.origin
    return response
  } else if (authObject === "me" && isRoot) {
    throw new Error("400.context-substitution-failed")
  }
  // Check if `authSubject` is root for a root-only authType.
  if (isRoot) {
    //const _owner = !!authObject ? await TypeRepository._owner(authObject ?? "") : undefined
    response.id = authSubject.origin
    response.access_key = authSubject.access_key
    response.user_id = authSubject._id
    return response
  }

  // Check if `authObject` and `authSubject` are the same || authenticated for  resource *
  if (
    (!isRoot && authType.includes("self") && authSubject.origin === authObject) ||
    (JSON.stringify(authType) === JSON.stringify(["self", "sibling", "parent"]) && authObject === undefined)
  ) {
    response.id = authSubject.origin
    return response
  }
  // Optimization.
  if (!isRoot && (authType.includes("parent") || authType.includes("sibling"))) {
    let _owner = await TypeRepository._owner(authObject ?? "")

    // Check if the immediate parent type of `authObject` is found in `authSubject`'s inheritance tree.
    if (authType.includes("sibling") && _owner === (await TypeRepository._owner(authSubject.origin))) {
      response.id = authSubject.origin
      return response
    } else {
      // Check if `authSubject` is actually the parent ID of `authObject` matching the same type as `authSubject`.
      // Do the "parent" check before the "sibling" check since it's more likely to be the case, so short circuit here.
      while (_owner !== null) {
        if (_owner === authSubject.origin) {
          response.id = authSubject.origin
          return response
        }
        _owner = await TypeRepository._owner(_owner)
      }
    }
  }

  // We've given the authorization enough chances... fail now.
  throw new Error("403.security-context-out-of-scope")
}

export async function _createAuthSubjectFromToken(authHeader: string | undefined): Promise<AuthSubject> {
  const CredentialRepository = new Repository().getCredentialRepository()
  if (authHeader === undefined) throw new Error("401.missing-credentials")
  // Ensure the Authorization header contains the Bearer token.
  const token = authHeader.replace("Bearer", "").trim()
  if (!token) throw new Error("401.missing-token")

  const secretKey = new TextEncoder().encode(JWT_SECRET)
  let decoded: any
  try {
    // Verify the JWT token using secret key
    const { payload } = await jwtVerify(token, secretKey)
    decoded = payload

    if (!decoded) throw new Error("error")
  } catch (error) {
    throw new Error("401.invalid-token")
  }

  if (!decoded.user_id) throw new Error("401.missing-credentials")
  // const origin = await CredentialRepository._find(decoded.access_key, Decrypt(decoded.secret_key, "AES256"))
  const origin = decoded.origin
  //if (!origin) throw new Error("404. Not Found")
  return {
    origin: origin,
    access_key: decoded.access_key,
    secret_key: decoded.secret_key,
    _id: decoded.user_id,
  }
}

//function to get role of authorized user
export async function findPermission(accessKey: any) {
  const users = await MongoClientDB.collection("tag").findOne({ key: "lamp.dashboard.admin_permissions" })

  const permissions = JSON.parse(users.value)

  for (let i = 0; i < permissions.length; i++) {
    const item = permissions[i]

    for (let key in item) {
      if (key === accessKey) {
        return item[key]
      }
    }
  }

  return null
}

export async function validateInput(input: any) {
  if (input.length < 50) {
    return true
  }
}
