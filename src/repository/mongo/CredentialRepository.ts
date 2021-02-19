import crypto from "crypto"
import { Encrypt, Decrypt } from "../Bootstrap"
import { CredentialModel } from "../../model/Credential"
import { CredentialInterface } from "../interface/RepositoryInterface"

export class CredentialRepository implements CredentialInterface {
  // Lazy evaluation of root password if we haven't already loaded it.
  public async _adminCredential(admin_secret_key: string): Promise<boolean> {
    let _all: string[] = []
    try {
      ;(await CredentialModel.find({ origin: null, access_key: "admin" }).limit(2_147_483_647)).filter((x: any) =>
        _all.push(x.secret_key)
      )
      if (0 === _all.length) {
        console.dir(
          `Because no master configuration could be located, an initial administrator password was generated and saved for this installation.`
        )
        const p = crypto.randomBytes(32).toString("hex")
        console.table({ "Administrator Password": p })
        _all = [Encrypt(p, "AES256") as string]
        await new CredentialModel({
          origin: null,
          access_key: "admin",
          secret_key: _all[0],
          description: "System Administrator Credential",
        } as any).save()
      }
    } catch (e) {
      console.dir(e)
      return false
    }

    return _all.filter((key) => Decrypt(key, "AES256") === admin_secret_key).length > 0
  }
  // if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
  public async _find(access_key: string, secret_key?: string): Promise<string> {
    const res = (await CredentialModel.find({ access_key: access_key }).limit(2_147_483_647)).filter((x: any) =>
      !!secret_key ? Decrypt(x.secret_key, "AES256") === secret_key : true
    )

    if (res.length !== 0) return (res[0] as any).origin
    throw new Error("403.no-such-credentials")
  }
  public async _select(type_id: string): Promise<any[]> {
    const res = await CredentialModel.find({ origin: type_id }).limit(2_147_483_647)
    return res.map((x: any) => ({
      ...x._doc,
      secret_key: null,
      _id: undefined,
      __v: undefined,
    }))
  }
  public async _insert(type_id: string, credential: any): Promise<{}> {
    if (credential.origin === "me") {
      // FIXME: context substitution doesn't actually work within the object here, so do it manually.
      credential.origin = type_id
    }
    // Verify this is "our" credential correctly
    if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
      throw new Error("400.malformed-credential-object")
    const res = await CredentialModel.findOne({ access_key: credential.access_key })

    if (res !== null) throw new Error("403.access-key-already-in-use")
    //save Credential via Credential model
    await new CredentialModel({
      origin: credential.origin,
      access_key: credential.access_key,
      secret_key: Encrypt(credential.secret_key, "AES256"),
      description: credential.description,
    } as any).save()
    return {}
  }
  public async _update(type_id: string, access_key: string, credential: any): Promise<{}> {
    const res: any = await CredentialModel.findOne({ origin: type_id, access_key: access_key })
    if (res === null) throw new Error("404.no-such-credentials")
    const oldCred = res._id as any
    await CredentialModel.findByIdAndUpdate(oldCred, {
      secret_key: !!credential.secret_key ? Encrypt(credential.secret_key, "AES256") : res.secret_key,
      description: !!credential.description ? credential.description : res.description,
    })

    return {}
  }
  public async _delete(type_id: string, access_key: string): Promise<{}> {
    const res = await CredentialModel.findOne({ origin: type_id, access_key: access_key })
    if (res === null) throw new Error("404.no-such-credentials")
    const oldCred = res._id as any
    // await CredentialModel.findByIdAndUpdate(oldCred,{_deleted: true})
    await CredentialModel.deleteOne({ _id: oldCred })

    return {}
  }
  public async _packCosignerData(from: string, to: string): Promise<string> {
    throw new Error("503.unimplemented")
  }
  public _unpackCosignerData(authStr: string): [string, any] {
    const cosignData = authStr.startsWith("LAMP") ? JSON.parse(Decrypt(authStr.slice(4), "AES256") || "") : undefined
    if (cosignData !== undefined) return [Object.values(cosignData.cosigner).join(":"), cosignData]
    else return [authStr, undefined]
  }
}
