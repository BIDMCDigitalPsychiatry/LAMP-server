import { MongoClientDB } from "../../repository/Bootstrap";
import fs from "fs";
import { body } from "express-validator";


// Data integrity check pre-migration
/**
 * basicAuthMigrationDataReport should be run BEFORE migrating a server from basic auth to session auth
 * 
 * This script inspects the database and searches for conflicts that will cause problems for new server.
 * Most conflicts can be automatically resolved, but some may require system administrator intervention.
 * 
 * Duplicate Conflicts: While basicAuth servers enforce uniqueness in code, there is no database level 
 *      gaurentee that `access_key` is unique among Credential objects. If there are credentials with
 *      the same `access_key`, and only one of them is not deleted, we can automatically resolve the 
 *      conflict by removing deleted Credential objects from the database.
 *      These cases require system administrator intervention when there are multiple active Credentials
 *      with the same `access_key`.
 * 
 * Username Conflicts: Basic auth servers do not require `access_key` to be an email, but session auth 
 *      servers require all "user" objects to have an email. In most cases this requirement can be 
 *      automatically resolved by using a fake "@digitalpsych.org" email. (This technique is already 
 *      used when creating participants on the dashboard). In rare cases, the automatically generated
 *      fake email may already be access key for a Credential. 
 *      These cases require system admin intervention in order to avoid creating a duplicate conflict.
 * 
 * This script writes a report of all conflicts to `./migrationDataReportLatest.json`
 */

const EMAIL_DOMAIN = "digitalpsych.org"

export async function runBasicAuthMigrationDataReport() {
    const duplicateReportData: any = {}
    const usernameConflictReportData: any = {}

    // Check for credentials with duplicate access keys
    const Credential = MongoClientDB.collection("credential")

    const countedAccessKeys = await Credential.aggregate([
        {$group: {_id: "$access_key", count: {$sum: 1}}}
    ]).toArray()

    const annotated = Object.fromEntries(
        await Promise.all(countedAccessKeys.map(async (doc: any) => {
            const isEmail = !(await body("access_key").isEmail().run({body: {access_key: doc._id}})).array().length
            return [
                doc._id,
                {
                    duplicates: doc.count != 1,
                    isEmail: isEmail,
                    fakeEmail: isEmail ? undefined : `${doc._id}@${EMAIL_DOMAIN}` 
                }
            ]
        }))
    )

    const duplicateKeys = Object.entries(annotated).filter(([key, data]) => data.duplicates).map(([key, data]) => key)
    for (let key of duplicateKeys) {
        const duplicateCredentials = await Credential.find({access_key: key}).project({_id: true, access_key: true, _deleted: true, origin: true}).toArray()
        const inactive = duplicateCredentials.filter((doc:any) => doc._deleted)
        if (duplicateCredentials.length - inactive.length > 1) {
            duplicateReportData[key] = {
                resolvable: false,
                duplicateCredentials: duplicateCredentials
            }
        } else {
            duplicateReportData[key] = {
                resolvable: true,
                deleteCredentials: inactive
            }
        }
    }

    const noEmails = Object.fromEntries(Object.entries(annotated).filter(([key, data]) => !data.isEmail).map(([key, data]) => ([key, data.fakeEmail])))
    for (let [key, fakeEmail] of Object.entries(noEmails)) {
        if (annotated[fakeEmail]) {
            usernameConflictReportData[key] = {
                resolvable: false,
                automaticNewEmail: fakeEmail,
                conflictsWith: (await Credential.find({access_key: fakeEmail}).project({_id: true, _deleted: true, origin: true, access_key: true}).toArray())
            }
        } else {
            usernameConflictReportData[key] = {
                resolvable: true,
                automaticNewEmail: fakeEmail,
                automaticUsername: key,
            }
        }
    }


    const reportData = {usernameConflicts: usernameConflictReportData, duplicateConflicts: duplicateReportData}

    fs.writeFileSync('./migrationDataReportLatest.json', JSON.stringify(reportData, null, 2));

}