import { MongoClientDB } from "../../repository/Bootstrap";

export async function runBasicAuthServerMigration() {
    console.group("Running server upgrade migration...")
      // Get Credential objects that are missing associated accounts
      const credentials = await MongoClientDB.collection("credential").aggregate([
          {$lookup: {from: "account", localField: "_id", foreignField: "userId", as: "accounts"}},
          {$addFields: {numAccounts: {$size: "$accounts"}}},
          {$match: {numAccounts: 0}},
          {$project: {secret_key: true, numAccounts: true}}
        ]).toArray()
        
        // Prepare accounts for creation
        const accountObjects = []
        for (let credential of credentials) {
          accountObjects.push({
            providerId: "credential",
            userId: credential._id,
            password: credential.secret_key,
            updatedAt: new Date(),
            createdAt: new Date(),
          })
        }

        // Create accounts
        if (accountObjects.length) {
          const createAccountResult = await MongoClientDB.collection("account").insertMany(accountObjects)
          console.log(`Created ${createAccountResult.insertedCount} account documents`)
        } else {
          console.log("All user's have an associated account")
        }

        // Add usernames to participants where their access_key === origin
        // This part of the migration may need to be fine tuned based on the data in a given server
        const participantCredentials = await MongoClientDB.collection("credential").aggregate([
            {$addFields: {sameOriginAccessKey: {$eq: ["$origin", "$access_key"]}}},
            {$match: {sameOriginAccessKey: true, username: undefined}},
            {$lookup: {from: "participant", localField: "origin", foreignField: "_id", as: "participant"}},
            {$addFields: {participantCount: {$size: "$participant"}}},
            {$match: {participantCount: {$gte: 1}}}
        ]).toArray()
        if (!participantCredentials.length) {
            console.log("No users require usernames")
        }
        const credentialUpdatePromises = []
        for (let credential of participantCredentials) {
            credentialUpdatePromises.push(
                MongoClientDB.collection("credential").updateOne(
                    {_id: credential._id},
                    {$set: {
                        username: credential.access_key,
                        displayUsername: credential.access_key.toLowerCase()
                    }}
                )
            )
        }
        await Promise.all(credentialUpdatePromises)
        console.groupEnd()
      console.log("Server upgrade migration complete.")


}