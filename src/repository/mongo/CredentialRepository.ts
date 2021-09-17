import crypto from "crypto"
import { Encrypt, Decrypt } from "../Bootstrap"
import { CredentialInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
import { ObjectID } from "mongodb"

export class CredentialRepository implements CredentialInterface {
  // if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
  public async _find(access_key: string, secret_key?: string): Promise<string> {
    const res = (
      await MongoClientDB.collection("credential")
        .find({ _deleted: false, access_key: access_key })
        .limit(2_147_483_647)
        .maxTimeMS(60000)
        .toArray()
    ).filter((x: any) => (!!secret_key ? Decrypt(x.secret_key, "AES256") === secret_key : true))

    if (res.length !== 0) return (res[0] as any).origin
    throw new Error("403.no-such-credentials")
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
    if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
      throw new Error("400.malformed-credential-object")
    const res = await MongoClientDB.collection("credential").findOne({
      _deleted: false,
      access_key: credential.access_key,
    })

    if (res !== null) throw new Error("403.access-key-already-in-use")
    //save Credential via Credential model
    await MongoClientDB.collection("credential").insert({
      _id: new ObjectID(),
      origin: credential.origin,
      access_key: credential.access_key,
      secret_key: Encrypt(credential.secret_key, "AES256"),
      description: credential.description,
      _deleted: false,
    } as any)
    return {}
  }
  public async _update(type_id: string | null, access_key: string, credential: any): Promise<{}> {
    const res: any = await MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })
    if (res === null) throw new Error("404.no-such-credentials")
    const oldCred = res._id as any
    await MongoClientDB.collection("credential").findOneAndUpdate(
      { _id: oldCred },
      {
        $set: {
          secret_key: !!credential.secret_key ? Encrypt(credential.secret_key, "AES256") : res.secret_key,
          description: !!credential.description ? credential.description : res.description,
        },
      }
    )

    return {}
  }
  public async _delete(type_id: string | null, access_key: string): Promise<{}> {
    const res = await MongoClientDB.collection("credential").findOne({ origin: type_id, access_key: access_key })
    if (res === null) throw new Error("404.no-such-credentials")
    const oldCred = res._id as any
    await MongoClientDB.collection("credential").findOneAndUpdate({ _id: oldCred }, { $set: { _deleted: true } })
    // await CredentialModel.deleteOne({ _id: oldCred })

    return {}
  }
}
