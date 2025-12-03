import { Bootstrap, MongoClientDB, Repository } from "./repository/Bootstrap";
import app from "./app"; // This import is unused but is required for Bootstrap to run correctly
import { exit } from "process";

async function migrateBasicAuthServer() {
    console.log("=== MIGRATE BASIC AUTH SERVER ===")
    await Bootstrap()
    const credentials = await MongoClientDB.collection("credential").find().toArray()
    const accountObjects = []
    for (let credential of credentials) {
        accountObjects.push({
            providerId: "credential",
            userId: credential._id,
            password: credential.secret_key,
            updatedAt: new Date(),
            createdAt: new Date()
        })
    }
    await MongoClientDB.collection("account").insertMany(accountObjects)
}

migrateBasicAuthServer().then(() => {
    console.log("=== END ===")
    exit(0)
})