import { Repository } from "../repository/Bootstrap"
import { MongoClientDB } from "../repository/Bootstrap"
import {Session} from "../utils/auth"


// Simple Role-Based-Access-Control (RBAC) to answer: Can (subject) (verb) (object)?
// The (subject) is indicated as the Authorization header of the HTTP call and passed in here.
//    - We assume the authSubject has already been authenticated
// The (verb) is indicated in the function that calls _authorize (ie. Activity.create).
// The (object) is provided in the URL (usually) and passed in here (either string ID or null for "root").
// - Additionally, the "type" array allows restricting hierarchical ownership of subject -> object.
//   Use [] (empty array) to indicate that ONLY root credentials are allowed to (verb).
export async function _authorize(
  authSubject: Session["user"], 
  authType: Array<"self" | "sibling" | "parent"> /* 'root' = [] */, 
  authObject?: string | null
):Promise<string|null|undefined> {
  const TypeRepository = new Repository().getTypeRepository()
  
  function authMatches(testAuthType: Array<"self" | "sibling" | "parent">): boolean {
    // Returns true if the the provided authType matches the one passed into the function and false otherwise
    if (testAuthType.length !== authType.length) {
      return false
    }
    for (let permission of testAuthType) {
      if (!authType.includes(permission)) {
        return false
      }
    }
    return true
  }
  
  function authContains(permission: "self" | "sibling" | "parent"): boolean {
    // Returns true if the provided permission is included in the authType passed to _authorize
    return authType.includes(permission)
  }
  

  const isRoot = authSubject.origin === null;
  // Non root user's may substitute "me" with their origin
  if (authObject === "me" && !isRoot) {
    authObject = authSubject.origin 
  } else if (authObject === "me" && isRoot) {
    throw new Error("400.context-substitution-failed")
  }

  // Root users can do anything
  if (isRoot) {
    return authSubject.origin
  }

  // Check if self permissions apply
  if (authType.includes("self") && authSubject.origin === authObject || 
  authMatches(["self", "sibling", "parent"]) && authObject === undefined) {
    return authSubject.origin
  }
  
  if (authContains("parent") || authContains("sibling")) {
    let objectOwner = await TypeRepository._owner(authObject ?? "")
    let subjectOwner = await TypeRepository._owner(authSubject.origin ?? "")
    
    // Check if sibling permissions apply 
    if (authContains("sibling") && objectOwner === subjectOwner) {
      return authSubject.origin
    }
    
    let currentOwner = objectOwner
    // Check if parent or sibling permissions apply
    while (currentOwner !== null) {
      if (currentOwner === authSubject.origin) {
        return authSubject.origin
      }
      currentOwner = await TypeRepository._owner(currentOwner)
    }
  }

  throw new Error("403.security-context-out-of-scope")
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
