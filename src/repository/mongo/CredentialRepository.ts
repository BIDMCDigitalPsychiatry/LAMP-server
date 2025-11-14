import crypto from "crypto"
import { Encrypt, Decrypt } from "../../utils/auth"
import { CredentialInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
import { ObjectId } from "mongodb"
import { jwtVerify, SignJWT } from "jose"
import { auth } from "../../utils/auth"

const { isLocked, recordFailedAttempts, clearAttempts } = require("../../utils/accountLockout")

export class CredentialRepository implements CredentialInterface {
  // if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
  public async _find(access_key: string, secret_key?: string): Promise<string> {
    if (isLocked(access_key)) {
      throw new Error("Account is temporarily locked. Try again later.")
    }
    const res = (
      await MongoClientDB.collection("credential")
        .find({ _deleted: false, access_key: access_key })
        .limit(2_147_483_647)
        .maxTimeMS(60000)
        .toArray()
    ).filter((x: any) => (!!secret_key ? Decrypt(x.secret_key, "AES256") === secret_key : true))

    if (res.length !== 0) return (res[0] as any).origin
    else {
      throw new Error("403.no-such-credentials")
    }
  }

  public async _select(type_id: string | null): Promise<any[]> {
    const res = await MongoClientDB.collection("credential")
      .find({ _deleted: false, origin: type_id })
      .limit(2_147_483_647)
      .maxTimeMS(60000)
      .toArray()
    return res.map((x: any) => ({
      ...x,
      secret_key: null,
      _id: undefined,
      _deleted: undefined,
    }))
  }

  public async _insert(type_id: string | null, credential: any): Promise<{}> {
    if (credential.origin === "me" || credential.origin === null) {
      // FIXME: context substitution doesn't actually work within the object here, so do it manually.
      credential.origin = type_id
    }
    // Verify this is "our" credential correctly
    if (credential.origin !== type_id || !credential.access_key || !credential.secret_key) {
      throw new Error("400.malformed-credential-object")
    }
    const res = await MongoClientDB.collection("credential").findOne({
      _deleted: false,
      access_key: credential.access_key,
    })
    if (res !== null) { throw new Error("403.access-key-already-in-use") }

    //save Credential via Credential model
    await auth.api.signUpEmail({body: { // TODO: error handling!!!
      email: credential.access_key,
      password: credential.secret_key,
      origin: credential.origin,
      name: credential.access_key,
      description: credential.description,
   }})
    return {}
  }

  public async _update(type_id: string | null, access_key: string, credential: any): Promise<{}> {
    const res: any = await MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })
    if (res === null) { throw new Error("404.no-such-credentials") }
    
    const authContext = await auth.$context
    // Update the user's description
    const oldCred = res._id as any
    if (!!credential.description) {
      const updateResult = await authContext.internalAdapter.updateUser(oldCred, {description: credential.description})
      if (updateResult === null) {
        throw new Error("Something went wrong TODO: fix this error")
      }
    }

    // Update the user's password
    if (!!credential.secret_key) {
      const hashedPassword = await authContext.password.hash(credential.secret_key)
      await authContext.internalAdapter.updatePassword(oldCred as string, hashedPassword)
    }

    return {}
  }

  public async _delete(type_id: string | null, access_key: string): Promise<{}> {
    const res = await MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })
    if (res === null) throw new Error("404.no-such-credentials")
    const oldCred = res._id as any
    await MongoClientDB.collection("credential").findOneAndUpdate({ _id: oldCred }, { $set: { _deleted: true } })

    return {}
  }

  public async _login(accessKey: string | null, secretKey: string): Promise<any> {
    if (accessKey === null || accessKey === undefined ) {
      throw new Error("404.no-such-credentials")
    }
    if (secretKey === null || secretKey === undefined) {
      throw new Error("404.no-such-credentials")
    }

    try {
      const res = await auth.api.signInEmail({returnHeaders: true, body: {email: accessKey, password: secretKey}})

      // Do not allow deleted users to log in
      if (!!res.response?.user?.id) {
        const user = await MongoClientDB.collection("credential").findOne({access_key: accessKey})
        if (user._deleted) {
          await this._logout(res.response.token)
          throw new Error("404.no-such-credentials")
        }
      }

      // If the login attempt in successful, clear the failed login attempt count
      clearAttempts(accessKey)
      return res as any
    }
    catch(err) {
      recordFailedAttempts(accessKey)
      throw new Error("404.no-such-credentials")
    }
  }

  public async _logout(token: string | undefined): Promise<any> {
    if (token) {
      const result = await MongoClientDB.collection("session").deleteOne({token: token})
    }
    return {"message": "Logged out"}
  }
}
