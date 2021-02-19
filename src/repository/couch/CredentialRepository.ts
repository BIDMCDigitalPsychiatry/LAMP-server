import crypto from "crypto"
import { Database, Encrypt, Decrypt } from "../Bootstrap"
import { CredentialInterface } from "../interface/RepositoryInterface"

export class CredentialRepository implements CredentialInterface {
  // Lazy evaluation of root password if we haven't already loaded it.
  public async _adminCredential(admin_secret_key: string): Promise<boolean> {
    let _all: string[]
    try {
      _all = (
        await Database.use("credential").find({
          selector: {
            origin: null,
            access_key: "admin",
          },
          limit: 2_147_483_647 /* 32-bit INT_MAX */,
        })
      ).docs.map((x: any) => x.secret_key)
      if (_all.length === 0) {
        // eslint-disable-next-line
        console.dir(
          `Because no master configuration could be located, an initial administrator password was generated and saved for this installation.`
        )

        // Create a new password and emit it to the console while saving it (to share it with the sysadmin).
        const p = crypto.randomBytes(32).toString("hex")
        console.table({ "Administrator Password": p })
        _all = [Encrypt(p, "AES256") as string]
        await Database.use("credential").insert({
          origin: null,
          access_key: "admin",
          secret_key: _all[0],
          description: "System Administrator Credential",
        } as any)
      }
    } catch (e) {
      console.dir(e)
      return false
    }
    return _all.filter((key) => Decrypt(key, "AES256") === admin_secret_key).length > 0
  }
  // if used with secret_key, will throw error if mismatch, else, will return confirmation of existence
  public async _find(access_key: string, secret_key?: string): Promise<string> {
    const res = (
      await Database.use("credential").find({
        selector: { access_key: access_key },
        limit: 2_147_483_647 /* 32-bit INT_MAX */,
      })
    ).docs.filter((x: any) => (!!secret_key ? Decrypt(x.secret_key, "AES256") === secret_key : true))
    if (res.length !== 0) return (res[0] as any).origin
    throw new Error("403.no-such-credentials")
  }
  public async _select(type_id: string): Promise<any[]> {
    const res = await Database.use("credential").find({
      selector: { origin: type_id },
      limit: 2_147_483_647 /* 32-bit INT_MAX */,
    })
    return res.docs.map((x: any) => ({
      ...x,
      secret_key: null,
      _id: undefined,
      _rev: undefined,
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
    const res = await Database.use("credential").find({
      selector: { access_key: credential.access_key },
      limit: 1 /* single result only */,
    })
    if (res.docs.length !== 0) throw new Error("403.access-key-already-in-use")
    await Database.use("credential").insert({
      origin: credential.origin,
      access_key: credential.access_key,
      secret_key: Encrypt(credential.secret_key, "AES256"),
      description: credential.description,
    } as any)
    return {}
  }
  public async _update(type_id: string, access_key: string, credential: any): Promise<{}> {
    const res = await Database.use("credential").find({
      selector: { origin: type_id, access_key: access_key },
      limit: 1 /* single result only */,
    })
    if (res.docs.length === 0) throw new Error("404.no-such-credentials")
    const oldCred = res.docs[0] as any
    await Database.use("credential").bulk({
      docs: [
        {
          ...oldCred,
          secret_key: !!credential.secret_key ? Encrypt(credential.secret_key, "AES256") : oldCred.secret_key,
          description: !!credential.description ? credential.description : oldCred.description,
        },
      ],
    })
    return {}
  }
  public async _delete(type_id: string, access_key: string): Promise<{}> {
    const res = await Database.use("credential").find({
      selector: { origin: type_id, access_key: access_key },
      limit: 1 /* single result only */,
    })
    if (res.docs.length === 0) throw new Error("404.no-such-credentials")
    const oldCred = res.docs[0] as any
    await Database.use("credential").bulk({
      docs: [
        {
          ...oldCred,
          _deleted: true,
        },
      ],
    })
    return {}
  }
  public async _packCosignerData(from: string, to: string): Promise<string> {
    // FIXME: the #master_config document is deprecated and will not work.
    const _cosign = ((await Database.use("credential").get("#master_config")) as any)?.data?.password
    const _data = JSON.stringify({
      identity: { from: from, to: to },
      cosigner: { id: "root", password: _cosign },
    })
    return `LAMP${Encrypt(_data, "AES256")}`
  }
  public _unpackCosignerData(authStr: string): [string, any] {
    const cosignData = authStr.startsWith("LAMP") ? JSON.parse(Decrypt(authStr.slice(4), "AES256") || "") : undefined
    if (cosignData !== undefined) return [Object.values(cosignData.cosigner).join(":"), cosignData]
    else return [authStr, undefined]
  }
}
