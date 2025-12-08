export async function BackfillAccountCollection(dbClient: any) : Promise<void> {
  console.log("=== MIGRATE BASIC AUTH SERVER ===")
  const credentials = await dbClient.collection("credential").find().toArray()
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
  await dbClient.collection("account").insertMany(accountObjects)
  console.log("=== END ===")
}