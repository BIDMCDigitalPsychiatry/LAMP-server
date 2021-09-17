import { Database, Encrypt, Decrypt } from "../Bootstrap"
import { CredentialInterface } from "../interface/RepositoryInterface"

export class CredentialRepository implements CredentialInterface {
  
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
  public async _select(type_id: string | null): Promise<any[]> {
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
  public async _insert(type_id: string | null, credential: any): Promise<{}> {
    if (credential.origin === "me" || credential.origin === null) {
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
  public async _update(type_id: string | null, access_key: string, credential: any): Promise<{}> {
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
  public async _delete(type_id: string | null, access_key: string): Promise<{}> {
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
}
