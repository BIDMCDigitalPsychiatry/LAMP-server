import { Bootstrap, Repository } from "../../repository/Bootstrap";
import app from "../../app"; // This import is unused but is required for Bootstrap to run correctly
import { runBasicAuthMigrationDataReport } from "./basicAuthMigrationDataReport";

async function runReport() {
    await Bootstrap()

    await runBasicAuthMigrationDataReport();
}

runReport().then(() => {
    console.log("Finished running report"); 
    process.exit()
})
