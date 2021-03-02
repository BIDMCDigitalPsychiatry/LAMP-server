import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { Encrypt } from "../repository/Bootstrap"
import crypto from "crypto"
import mongoose from "mongoose"
const { Schema } = mongoose
export class Credential {
  public origin = ""
  public access_key = ""
  public secret_key: string | null = ""
  public description = ""
}

//Mongo Db Model for credential collection
export const CredentialModel = mongoose.model<mongoose.Document>(
  "credential",
  new Schema(
    {
      origin: { type: String, default: null },
      access_key: { type: String, required: true },
      secret_key: { type: String, required: true },
      description: { type: String, required: true },
    },
    { collection: "credential", autoCreate: true }
  ).index([{ access_key: 1 }, { origin: 1 }, { origin: 1, access_key: 1 }])
)

export async function adminCredential() {   
  let _all: string[] = []
  const data = await CredentialModel.find({ origin: null, access_key: "admin" })  
    .limit(2_147_483_647)
    .then((x: any) => {      
      if (x.length === 0) {
        console.dir(
          `Because no master configuration could be located, an initial administrator password was generated and saved for this installation.`
        );
        const p = crypto.randomBytes(32).toString("hex");
        console.table({ "Administrator Password": p });
        _all = [Encrypt(p, "AES256") as string];
         new CredentialModel({
          origin: null,
          access_key: "admin",
          secret_key: _all[0],
          description: "System Administrator Credential",
        } as any).save()
      }
    })
  }

