import { Repository } from "../repository/Bootstrap"
import { MongoClientDB } from "../repository/Bootstrap"
import {Session} from "../utils/auth"
import { ActingUserContext } from "../middlewares/authenticateSession"

// Not all endpoints should be accessible using only an api key
// For example: You should not be able to use an admin api key to make more admin api keys
// ApiKeyAccessLevels restrict which types of user may access an endpoint using their api key 
export enum ApiKeyAccessLevels {
  NONE = "NONE",                  // No one may use api keys for these endpoints
  SYSTEM_ADMIN = "SYSTEM_ADMIN",  // Only system admins may use api keys for these endpoints
  RESEARCHER = "RESEARCHER",      // Researchers and admins may use api keys for these endpoints
  STANDARD = "STANDARD",          // There are no additional restrictions for api key use
}

async function checkApiKeyAccessLevel(user:Session["user"], accessLevel:ApiKeyAccessLevels) {
  if (accessLevel === ApiKeyAccessLevels.NONE) {
    return false
  } 
  if (accessLevel === ApiKeyAccessLevels.SYSTEM_ADMIN) {
    // TODO: Check for actual system admin role permissions
    return user.userType === "admin"
  }
  if (accessLevel === ApiKeyAccessLevels.RESEARCHER) {
    return ["admin", "researcher"].includes(user.userType || "")
  }
  
  return true
}

// Simple Role-Based-Access-Control (RBAC) to answer: Can (subject) (verb) (object)?
// The (subject) is indicated as the Authorization header of the HTTP call and passed in here.
//    - We assume the authSubject has already been authenticated
// The (verb) is indicated in the function that calls _authorize (ie. Activity.create).
// The (object) is provided in the URL (usually) and passed in here (either string ID or null for "root").
// - Additionally, the "type" array allows restricting hierarchical ownership of subject -> object.
//   Use [] (empty array) to indicate that ONLY root credentials are allowed to (verb).
export async function _authorize(
  authSubject: ActingUserContext, 
  authType: Array<"self" | "sibling" | "parent"> /* 'root' = [] */, 
  authObject?: string | null,
  apiKeyAccessLevel = ApiKeyAccessLevels.NONE,
):Promise<string|null|undefined> {
  const actingUser = authSubject.user
  const authenticatedApiKey = authSubject.apiKey
  
  if (!!authenticatedApiKey && !(await checkApiKeyAccessLevel(actingUser, apiKeyAccessLevel))) {
    throw new Error("403.security-context-out-of-scope")
  }
  
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
  

  const isRoot = actingUser.origin === null;
  // Non root user's may substitute "me" with their origin
  if (authObject === "me" && !isRoot) {
    authObject = actingUser.origin 
  } else if (authObject === "me" && isRoot) {
    throw new Error("400.context-substitution-failed")
  }

  // Root users can do anything
  if (isRoot) {
    return actingUser.origin
  }

  // Check if self permissions apply
  if (authType.includes("self") && actingUser.origin === authObject || 
  authMatches(["self", "sibling", "parent"]) && authObject === undefined) {
    return actingUser.origin
  }
  
  if (authContains("parent") || authContains("sibling")) {
    let objectOwner = await TypeRepository._owner(authObject ?? "")
    let subjectOwner = await TypeRepository._owner(actingUser.origin ?? "")
    
    // Check if sibling permissions apply 
    if (authContains("sibling") && objectOwner === subjectOwner) {
      return actingUser.origin
    }
    
    let currentOwner = objectOwner
    // Check if parent or sibling permissions apply
    while (currentOwner !== null) {
      if (currentOwner === actingUser.origin) {
        return actingUser.origin
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
