import crypto from "crypto"
import { Encrypt, Decrypt } from "../Bootstrap"
import { CredentialInterface } from "../interface/RepositoryInterface"
import { MongoClientDB } from "../Bootstrap"
import { ObjectId } from "mongodb"
import { jwtVerify, SignJWT } from "jose"
const path = require('path');

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
    if (credential.origin !== type_id || !credential.access_key || !credential.secret_key)
      throw new Error("400.malformed-credential-object")
    const res = await MongoClientDB.collection("credential").findOne({
      _deleted: false,
      access_key: credential.access_key,
    })

    if (res !== null) throw new Error("403.access-key-already-in-use")
    //save Credential via Credential model
    await MongoClientDB.collection("credential").insertOne({
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

    const { privateDecrypt, constants } = require("crypto")
    const fs = require("fs")

    const privateKeyPath = path.resolve(process.cwd(), 'private_key.pem');
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const encryptedPassword = secretKey
    let decrypted
    try {
      decrypted = privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encryptedPassword, "base64")
      ).toString("utf8")
    } catch (error) {
      console.error("Decryption error:", error)
    }

    if (isLocked(decrypted)) {
      throw new Error("403.Account has been logged out, please try again later")
    }
    const res = await MongoClientDB.collection("credential").findOne({ _deleted: false, access_key: accessKey })

    if (res?.length !== 0 && res !== null) {
      const secretKeyDecrypted = Decrypt(res?.secret_key, "AES256")
      if (decrypted === secretKeyDecrypted) {
        // Generating jwt access token
        try {
          res.access_token = await new SignJWT({ user_id: res._id, origin: res.origin })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("30m")
            .sign(secret_key)

          res.refresh_token = await new SignJWT({ user_id: res._id, origin: res.origin })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret_key)

          const { payload, protectedHeader } = await jwtVerify(res.refresh_token, secret_key)
          clearAttempts(decrypted)
        } catch (err) {
          console.log(err)
        }

        res.typeId = res?.id

        return res as any
      } else {
        recordFailedAttempts(decrypted)
        throw new Error("403.no-such-credentials")
      }
    } else {
      recordFailedAttempts(decrypted)
      throw new Error("403.no-such-credentials")
    }
  }

  public async _logout(token: string | undefined): Promise<any> {
    await MongoClientDB.collection("tokens").insertOne({
      _id: new ObjectId(),
      token: token,
    } as any)
    return {}
  }

  public async _renewToken(refreshToken: string): Promise<any> {
    const JWT_SECRET = process.env.SECRET_KEY as string
    const jwtSecretKey = new TextEncoder().encode(JWT_SECRET)
    try {
      const { payload }: any = await jwtVerify(refreshToken, jwtSecretKey)
      const accessKey = payload?.access_key
      const secretKey = payload?.secret_key
      const user_id = payload?.user_id

      const res = await MongoClientDB.collection("credential").findOne({
        _deleted: false,
        _id: new ObjectId(payload.user_id),
      })

      if (res?.length !== 0) {
        // Generating new tokens
        try {
          res.access_token = await new SignJWT({ user_id: res._id, origin: res.origin })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("30m")
            .sign(jwtSecretKey)

          res.refresh_token = await new SignJWT({ user_id: res._id, origin: res.origin })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(jwtSecretKey)
          res.typeId = res.id

          return res as any
        } catch (err) {
          console.log(err)
        }
      }
    } catch (error) {
      throw new Error("401.invalid-token")
    }
  }
}
