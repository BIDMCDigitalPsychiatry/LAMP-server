const PouchDB = require('pouchdb')
const CDB = process.env.CDB;

//Replication/Sync event handling
const onSyncError = () => {
  // tslint:disable-next-line:no-console
  console.log("error");
 
}
const onSyncChange = () => {
  //tslint:disable-next-line:no-console
  console.log("changed");
  
}
const onSyncPaused = () => {
  // tslint:disable-next-line:no-console
  console.log("paused");
 
}

// sync user data bidirectional
const biSync = async (db: string, userId: string, identifier: string) => {
  try {
    let local = new PouchDB(db);
    let remote = new PouchDB(`${CDB}/${db}`);
    let opts = {};
    if (identifier === '_id') {
      opts = { live: true, retry: true, filter: 'userfilter/by_user', query_params: { _id: userId } };
    } else if (identifier === 'origin') {
      opts = { live: true, retry: true, filter: 'userfilter/by_user', query_params: { origin: userId } };
    } else if (identifier === '#parent') {
      opts = { live: true, retry: true, filter: 'userfilter/by_user', query_params: { parent: userId } };
    }
    let repl: any = await remote.replicate.to(local, {
      filter: 'userfilter/by_user',
      query_params: { parent: userId }
    }).on('complete', () => {
      if (db === 'activity_event' || db === 'sensor_event') {
        indexCreate(db);
      }
      local.sync(remote, opts)
        .on('change', onSyncChange)
        .on('paused', onSyncPaused)
        .on('error', onSyncError);

    }).on('error', () => {
      console.log("ERROR ON COMPLETE");
    });
    return repl;
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log(error);

  }
}

//sync user data from remote db
const replicateFrom = async (db: string) => {
  try {
    let local = new PouchDB(db);
    let remote = new PouchDB(`${CDB}/${db}`);
    let repl: any = await remote.replicate.to(local).on('complete', () => {
      // tslint:disable-next-line:no-console
      console.log("replication");
    }).on('change', onSyncChange);

    return repl;

  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log(error);
  }
}


//Create appropriate indexing for pouch db
const indexCreate = async (dbAct: string) => {
  PouchDB.plugin(require('pouchdb-find'));
  let db = new PouchDB('sensor_event')
  try {
    if (dbAct === "activity_event") {
      db = new PouchDB(dbAct);
      await db.createIndex({
        index: {
          fields: ['timestamp']
        }
      });
      await db.createIndex({
        index: {
          fields: ['activity']
        }
      });
    } else {
      db = new PouchDB('sensor_event');
      await db.createIndex({
        index: {
          fields: ['timestamp']
        }
      });
      await db.createIndex({
        index: {
          fields: ['sensor']
        }
      });
    }

  } catch (err) {
    // tslint:disable-next-line:no-console
    console.log(err);
  }
}

//Sync between database, while handling API
export const sync = (from: string, to: string): string | undefined => {
  const status: any = false;
  try {
    const rep = PouchDB.replicate(from, `${CDB}${to}`);
    // tslint:disable-next-line:no-console
    console.log(`${CDB}${to}`);
    return status;
  } catch (error) {
    return error;
  }
}

//get user data from local db
export const activityData = async (userId: string) => {

  let status: any = false;
  try {
    const db = new PouchDB('activity_event');
    const result: any = await db.allDocs({
      include_docs: true,
      attachments: true
    });
    if (result.total_rows > 0) {
      status = "true";
    }
    if (!status) {
      //tslint:disable-next-line:no-console
      console.log("no_data");
      try {
        replicateFrom('activity');
        replicateFrom('activity_spec');
        replicateFrom('migrator_link');
        replicateFrom('researcher');
        replicateFrom('sensor');
        replicateFrom('sensor_spec');
        replicateFrom('root');
        replicateFrom('study');
        replicateFrom('tags');
        //tslint:disable-next-line:no-console
        console.log("dbsync");
        biSync('activity_event', userId, "#parent");
        biSync('sensor_event', userId, "#parent");
        biSync('credential', userId, "origin");
        biSync('participant', userId, "_id");

      } catch (error) {
        //tslint:disable-next-line:no-console
        console.log("errorHere");
        console.log(error);
      }
    } else {
      // tslint:disable-next-line:no-console
      console.log("There is local data");
    }

    return status;

  } catch (error) {
    return error;
  }
}

