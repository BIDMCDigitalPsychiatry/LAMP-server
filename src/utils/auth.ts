import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import crypto from "crypto";
import { MongoClient } from "mongodb";

const client = new MongoClient(`${process.env.DB}`)
const db = client.db("LampV2")

const emailAndPasswordOptions:any = {
    enabled: true
}

// We must use the old password verification system for servers which 
// have been upgraded from the previous release
const legacyPasswordVerification = {
    hash: async (password: string) => {
        // Custom password hashing
        return Encrypt(password, "AES256");
    },
    verify: async ({ hash, password }:{hash: string, password: string}) => {
        // Custom password verification
        return Decrypt(hash, "AES256") === password;
    }
}
if (process.env.USE_LEGACY_PASSWORD_HASHING) {
    emailAndPasswordOptions.password = legacyPasswordVerification
}


export const auth = betterAuth({
    database: mongodbAdapter(db, {client}),
    basePath: "/api/auth",
    emailAndPassword: {
        enabled: true
    },
    user: {
        modelName: "credential",
        fields: {
            email: "access_key"
        },
        additionalFields: {
            origin: {
                type: "string",
                required: false,
                returned: true,
            },
            description: {
                type: "string",
                defaultValue: "",
                required: false,
                returned: true,
            },
            _deleted: {
                type: "boolean",
                defaultValue: false,
                returned: true,
                input: false,
            }
        }
    }
})


export type Session = typeof auth.$Infer.Session



// The Encrypt and Decrypt functions are used to support servers upgraded from basic auth servers

/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
export function Encrypt(data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined {
  try {
    if (mode === "Rijndael") {
        console.log("mode Rijneal")
      const cipher = crypto.createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "utf8", "base64") + cipher.final("base64")
    } else if (mode === "AES256") {
        console.log("mode aes256")
      const ivl = crypto.randomBytes(16)
      console.log("about to use key")
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl)
      console.log("used key")
      return Buffer.concat([ivl, cipher.update(Buffer.from(data, "utf16le")), cipher.final()]).toString("base64")
    }
  } catch (error) {
    console.error("Encryption error:", error)
    return undefined
  }
}

/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */

export function Decrypt(data: string, mode: "Rijndael" | "AES256" = "Rijndael"): string | undefined {
  try {
    if (mode === "Rijndael") {
      const cipher = crypto.createDecipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
      return cipher.update(data, "base64", "utf8") + cipher.final("utf8")
    } else if (mode === "AES256") {
      const dat = Buffer.from(data, "base64")
      const cipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ROOT_KEY || "", "hex"),
        dat.slice(0, 16)
      )
      return Buffer.concat([cipher.update(dat.slice(16)), cipher.final()]).toString("utf16le")
    }
  } catch (error) {
    console.error("Encryption error:", error)
    return undefined
  }
}