import { betterAuth, z } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { openAPI } from "better-auth/plugins";


const client = new MongoClient(`${process.env.DB}`)
const db = client.db("LampV2")

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
    },
    plugins: [
        openAPI(),
    ],
    advanced: {
        cookies: {
            mycookie: {
                name: "mycookietest",
                attributes: {
                    httpOnly: false
                }
            }
        }
    }
})




export type Session = typeof auth.$Infer.Session
