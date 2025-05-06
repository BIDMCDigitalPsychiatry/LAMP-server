import { Encrypt, Decrypt } from "../Bootstrap"
import { CredentialInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
import { ObjectId } from "mongodb"
import { jwtVerify, SignJWT } from "jose"

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
      _id: new ObjectId(),
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

  public async _login(accessKey: string | null, secretKey: string): Promise<any> {
    const JWT_SECRET = process.env.SECRET_KEY as string
    const secret_key = new TextEncoder().encode(JWT_SECRET)

    const res = await MongoClientDB.collection("credential").findOne({ _deleted: false, access_key: accessKey })

    if (res?.length !== 0) {
      const secretKeyDecrypted = Decrypt(res.secret_key, "AES256")

      if (secretKey === secretKeyDecrypted) {
        // Generating jwt access token
        try {
          res.access_token = await new SignJWT({ access_key: res.access_key, secret_key: res.secret_key })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("2m")
            .sign(secret_key)

          // Refresh token
          res.refresh_token = await new SignJWT({ access_key: res.access_key, secret_key: res.secret_key })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(secret_key)
        } catch (err) {
          console.log(err)
        }

        res.typeId = res.id

        return res as any
      }
      throw new Error("403.no-such-credentials")
    }
    throw new Error("403.no-such-credentials")
  }

  public async _renewToken(refreshToken: string): Promise<any> {
    const JWT_SECRET = process.env.SECRET_KEY as string
    const jwtSecretKey = new TextEncoder().encode(JWT_SECRET)
    try {
      const { payload }: any = await jwtVerify(refreshToken, jwtSecretKey)
      const accessKey = payload?.access_key
      const secretKey = payload?.secret_key

      const res = await MongoClientDB.collection("credential").findOne({
        _deleted: false,
        access_key: accessKey,
      })

      if (res?.length !== 0) {
        // Generating new tokens
        if (secretKey === res.secret_key) {
          try {
            res.access_token = await new SignJWT({ access_key: accessKey, secret_key: secretKey })
              .setProtectedHeader({ alg: "HS256" })
              .setIssuedAt()
              .setExpirationTime("2m")
              .sign(jwtSecretKey)

            // Refresh token
            res.refresh_token = await new SignJWT({ access_key: accessKey, secret_key: secretKey })
              .setProtectedHeader({ alg: "HS256" })
              .setIssuedAt()
              .setExpirationTime("5m")
              .sign(jwtSecretKey)
            res.typeId = res.id

            return res as any
          } catch (err) {
            console.log(err)
          }
        }
      }
    } catch (error) {
      throw new Error("401.invalid-token")
    }

    throw new Error("403.no-such-credentials")
  }
}
