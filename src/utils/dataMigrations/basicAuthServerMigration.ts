import { MongoClientDB } from "../../repository/Bootstrap";
import { SetupStates } from "../accountSecurityUtilities";

const EMAIL_DOMAIN = "digitalpsych.org"

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


        // Clear credentials with deleted parents
        await clearDeletedParentCredentials()

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

async function addUsernames() {
  // Get all non email credentials

  // Create all email credentials
}


async function clearDeletedParentCredentials() {
  // Analysis of duplicate credentials in the production database revealed that
  // almost all duplicate credentials were associated with deleted parent objects.
  // Hard deleting all credentials associated with deleted researchers/participants
  // solves almost all duplicate access_key problems.

  // Get all deleted researchers/participants
  const researcherCollection = await MongoClientDB.collection("researcher")
  const participantCollection = await MongoClientDB.collection("participant")
  const credentialCollection = await MongoClientDB.collection("credential")
  
  const allOrigins = (await credentialCollection.distinct("origin")).filter((c: string | null) => c !== null)
  const allResearchers = researcherCollection.find().project({id: true, _deleted: true})
  const allParticipants = participantCollection.find().project({id: true, _deleted: true})

  // Sort researcher and participant ids by active vs deleted
  let activeParents = new Set()
  let deletedParents = new Set()
  for await (let r of allResearchers) {
    if (r._deleted) {
      deletedParents.add(r._id)
    } else {
      activeParents.add(r._id)
    }
  }
  for await (let p of allParticipants) {
    if (p._deleted) {
      deletedParents.add(p._id)
    } else {
      activeParents.add(p._id)
    }
  }

  // Sort existing origins by active/deleted/missing
  // Credentials with missing origins are not tied to any existing parent
  let missingOrigins = []
  let deletedOrigins = []
  let activeOrigins = []
  for (let o of allOrigins) {
    if (activeParents.has(o)) {
      activeOrigins.push(o)
    } else if (deletedParents.has(o)) {
      deletedOrigins.push(o)
    } else {
      missingOrigins.push(o)
    }
  }

  // Get and log the credentials we plan to delete
  const missingToDelete = await credentialCollection.find({origin: {$in: missingOrigins}}).project({_id: true, access_key: true, origin: true}).toArray()
  console.log("Deleting the following credentials with missing origins: ", missingToDelete)
  const deletedToDelete = await credentialCollection.find({origin: {$in: deletedOrigins}}).project({_id: true, access_key: true, origin: true}).toArray()
  console.log("Deleting the following credentials with deleted origins: ", deletedToDelete)

  // Delete the credentials
  const deleteIds = missingToDelete.concat(deletedToDelete).map((c: any) => c._id)
  const deleteResult = await credentialCollection.deleteMany({_id: {$in: deleteIds}})
  console.log(`Deleted ${deleteResult?.deletedCount || 0} total credentials`)
}

