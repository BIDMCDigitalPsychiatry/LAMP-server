import { MongoClientDB } from "../../repository/Bootstrap";
import { SetupStates } from "../accountSecurityUtilities";

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
        } else {
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
          const updateResult = await Promise.all(credentialUpdatePromises)
          console.log(`Added usernames to ${updateResult.length} participants`)
        }

        const adminUpdateResult = await MongoClientDB.collection("credential")
            .updateOne({
              access_key: "admin",
              username: {$exists: false}
            }, 
            {
              $set: {username: "admin", 
                displayUsername: "admin"}
            });
        if (adminUpdateResult.modifiedCount) {
          console.log("Added admin username to admin credential.")
        }


        // Add usertypes to credentials
        await addUserType("participant", "participant")
        await addUserType("researcher", "researcher")
        const userTypeUpdateResult = await MongoClientDB.collection("credential").updateMany(
          {origin: null, user_type: {$exists: false}},
          {$set: {user_type: "admin"}}
        )
        console.log(`Updated user_type for ${userTypeUpdateResult.modifiedCount} admins`)
        
        // Add account set up states to admin/researcher credentials
        let setupStateResult = await MongoClientDB.collection("credential").updateMany(
          {user_type: {$in: ["admin", "researcher"]}, accountSetupState: {$exists: false}},
          {$set: {account_setup_state: SetupStates.INCOMPLETE}}
        )
        if (!setupStateResult.modifiedCount) {
          console.log("No staff users require an account_setup_state")
        } else {
          console.log(`Updated account_setup_state for ${setupStateResult.modifiedCount} staff users`)
        }

        // Add account setup states to participant credentials
        setupStateResult = await MongoClientDB.collection("credential").updateMany(
          {user_type: "participant", account_setup_state: {$exists: false}},
          {$set: {account_setup_state: SetupStates.NOT_REQUIRED}}
        )
        if (!setupStateResult.modifiedCount) {
          console.log("No participants require an account_setup_state")
        } else {
          console.log(`Updated account_setup_state for ${setupStateResult.modifiedCount} participants`)
        }

        console.groupEnd()
      console.log("Server upgrade migration complete.")

}

async function addUserType(originCollection:"participant"|"researcher", userType:"participant"|"researcher") {
  // Get a list of all credentials associated with an entry in the origin collection
  let credentialsToUpdate = await MongoClientDB.collection(originCollection).aggregate([
    {$lookup: {
      from: "credential",
      localField: "_id",
      foreignField: "origin",
      as: "credentials",
      pipeline: [
        {$match: {user_type: {$exists: false}}},
        {$project: {"_id": true}}
      ]
    }},
    {$match: {credentials: {$ne: []}}},
    {$project: {credentials: true}}
  ]).toArray()
  credentialsToUpdate = credentialsToUpdate.map(({credentials}:{[k:string]:any}) => credentials)
  credentialsToUpdate = credentialsToUpdate.reduce(
    (accumulator:any, credList:any) => {
      credList.forEach((credential: any) => {accumulator.push(credential._id)})
      return accumulator
    },
    []
  )
  if (credentialsToUpdate.length) {
    // Assign a userType to each credential
    const updateResult = await MongoClientDB.collection("credential").updateMany(
      {_id: {$in: credentialsToUpdate}},
      {$set: {user_type: userType}}
    )
    console.log(`Updated user_type for ${updateResult.modifiedCount} ${originCollection}s`)
  } else {
    console.log(`No ${originCollection}s require user_types`)
  }
}