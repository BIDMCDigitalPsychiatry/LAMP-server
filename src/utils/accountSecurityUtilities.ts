import { json } from "zod";
import { MongoClientDB } from "../repository/Bootstrap";
import { Session, formatPrimaryKey } from "./auth";


// ACCOUNT SETUP STATE HELPERS

export type AccountSetupState = "INCOMPLETE" | "NOT_REQUIRED" | "OAUTH" | "TWO_FACTOR" | "TWO_FACTOR_UNVERIFIED";
export const SetupStates:{[index: string]: AccountSetupState} = {
  TWO_FACTOR: "TWO_FACTOR",
  TWO_FACTOR_UNVERIFIED: "TWO_FACTOR_UNVERIFIED",
  OAUTH: "OAUTH",
  NOT_REQUIRED: "NOT_REQUIRED",
  INCOMPLETE: "INCOMPLETE"
} as const;

export const COMPLETED_STATES = [
    SetupStates.TWO_FACTOR,
    SetupStates.OAUTH,
    SetupStates.NOT_REQUIRED
]

/** Returns true if the current state is in the allowed list of states */
export function isAccountSetupStateAllowed(currentState: AccountSetupState | undefined, allowedStates: AccountSetupState[]): boolean {
  return allowedStates.some((allowedState) => currentState === allowedState);
}

/** Returns true if the current state is in the list of COMPLETED_STATES */
export function isAccountSetupStateComplete(currentState: AccountSetupState | undefined) {
  return isAccountSetupStateAllowed(currentState, COMPLETED_STATES);
}

/** Returns the AccountSetupState of the user assuming the defined userType */
export async function checkSetupType(user: Session["user"], userType: string): Promise<AccountSetupState> {
  if (userType === "participant" || user.additionalSetupExempt || process.env.DISABLE_REQUIRE_OAUTH_OR_2FA === "true") {
    return SetupStates.NOT_REQUIRED;
  }
  const countOAuthAccounts = await MongoClientDB.collection("account").countDocuments({
    userId: formatPrimaryKey(user.id),
    providerId: { $ne: "credential" }
  });

  if (countOAuthAccounts) {
    return SetupStates.OAUTH;
  }

  const countActiveTwoFactor = await MongoClientDB.collection("twoFactor").countDocuments({
    userId: formatPrimaryKey(user.id),
    lastVerified: { $ne: undefined },
    _deleted: false
  });

  if (countActiveTwoFactor) {
    return SetupStates.TWO_FACTOR;
  }

  const countUnverifiedTwoFactor = await MongoClientDB.collection("twoFactor").countDocuments({
    userId: formatPrimaryKey(user.id),
    lastVerified: undefined,
    _deleted: false
  });

  if (countUnverifiedTwoFactor) {
    return SetupStates.TWO_FACTOR_UNVERIFIED;
  }

  return SetupStates.INCOMPLETE;
}


// TWO FACTOR API HELPERS

async function fetchTwoFactor(path:"email"|"phone"|"verify", body:{[key:string]:string}) {
  const url = new URL(process.env.NOTIFICATION_SERVICE_URL as string)
  url.pathname = `/v1/otp/${path}`
  return await fetch(
    url, 
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NOTIFICATION_API_KEY}`,
         "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    }
  )
}

export async function sendCodeToPhone(phone:string) {
  const result = await fetchTwoFactor(
    "phone",
    {phone: phone}
  )
  return await result.text()
}

export async function sendCodeToEmail(email:string) {
  const result = await fetchTwoFactor(
    "email",
    {email: email}
  )
  return await result.text()
}

export async function verifyCode(code:string, identifier:string) {
  const result = await fetchTwoFactor(
    "verify",
    {code, identifier}
  )
  return await result.text()
}