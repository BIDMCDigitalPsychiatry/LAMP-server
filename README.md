# LAMP Server

[To learn more about the LAMP Platform, visit our documentation.](https://docs.lamp.digital/)

## Setup For Local Development

1. Run `npm install`
2. Copy `example.env` and rename the copy to `.env`
3. Fill out the required fields of the new `.env` file. `example.env` contains example values that work for local development.
4. Ensure that docker is installed and can be run without using `sudo`.
5. Ensure that mongo is installed on your machine.
6. MindLAMP requires a replica set to work. Set up the keyfile so mongo can authenticate the replica set correctly.
    - Create the keyfile: `openssl rand -base64 768 > mongoDevKeyfile.txt`
    - Update the permissions so only the owner has read access: `chmod 400 mongoDevKeyfile.txt`
    - Update the owner of the keyfile to be the mongodb user profile: `sudo chown <mongodbuser>:<mongodbuser> mongoDevKeyfile.txt`
        - If you are having trouble figuring out what the mongodbuser is called try:
            - `mongodb`
            - Running the command: `docker exec -it <mongo docker container id> id -u mongodb`, and using the output as the mongodbuser in the chown command
    - The `mongo-init` service in `docker-compose.yaml` runs `rs.initiate()` automatically on first start (and is a no-op afterward), so no manual step is required to bootstrap the replica set.
7. Run `npm run dev`. Take note of the administrator password the command will print out the first time it is run successfully.
8. Log into the server via the dashboard using "admin" as the e-mail, and the password from step 7.

### Environment

| Name  | Required | Description                                                                                                                                                               |
|---|---|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `APP_GATEWAY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_URL`.                                                                                                                           |
| `CACHE_FLUSH_ALL`   |   |                                                                                                                                                                           |
| `CACHE_SIZE`   |   |                                                                                                                                                                           |
| `CDB`   |   | **Deprecated**. Couch DB is no longer used.                                                                                                                               |
| `DASHBOARD_URL`   | :heavy_check_mark:  |                                                                                                                                                                       |
| `DB`  | :heavy_check_mark:  | Database connection string.                                                                                                                                               |
| `DB_KEY`   |   |                                                                                                                                                                           |
| `NATS_SERVER`   | :heavy_check_mark:  |                                                                                                                                                                           |
| `NOTIFICATION_SERVICE_API_KEY`   |   | The api key to be used when addressing the designated notification service.                                                                                               |
| `NOTIFICATION_SERVICE_URL`   |  | The protocol scheme, hostname, and optionally port that points to the desired notification service.                                                                       |
| `PARTICIPANT_SESSION_EXPIRE_IN` | | Time in seconds after which to expires a participants's session
| `PARTICIPANT_SESSION_ROTATION_INTERVAL` | | Time in seconds after which to rotate a participant's session
|`PARTICIPANT_SESSION_UPDATE_AGE`|| Time in seconds after which to refresh a user's session
| `PORT`   |   | The port number the server should listen on. Defaults to 3000.                                                                                                            |
| `PUSH_API_KEY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_API_KEY`.                                                                                                                       |
| `PUSH_GATEWAY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_URL`.                                                                                                                           |
| `PUSH_GATEWAY_APIKEY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_API_KEY`.                                                                                                                       |
| `REDIS_HOST`  | :heavy_check_mark:  |                                                                                                                                                                           |
| `ROOT_KEY`   | :heavy_check_mark:  | An key used to encrypt credentials.                                                                                                                                       |
| `SHUTDOWN_GRACEPERIOD_MS`   | | The number of milliseconds after the process receives a termination signal before forcibly closing connections.                                                           |
| `STAFF_SESSION_EXPIRES_IN` || Time in seconds after which to expire a staff user's session
| `STAFF_SESSION_UPDATE_AGE` || Time in seconds after which to refresh a staff user's session
| `SYSTEM_STATUS_API_KEY`   |   | If set, some of the system info endpoints (such as `/system/metrics` or `/system/version`) will require a `key` query parameter equal to this env var in order to access. |

### Authentication with Better-Auth

MindLAMP uses the better-auth library to handle authentication for all users. It provides a lot of functionality surrounding login using o-auth, and server side sessions, but requires several customizations to work with the existing structure of mindLAMP's data. Below is a breif overview of some of the less intuitive customizations.

1. **Users == Credentials** -- MindLAMP uses the Credential model to represent users. We map the existing Credential table to better-auth's User table. This means that throughout the code, the same data might be refered to as either a credential, or a user depending on the context. Better-auth maps database field names to the field names it expects in its return values. This means that depending on how you retreive a credential/user, the same fields will appear to have different names. For example, the `access_key` field of a credential is aliased to `email` when retrieved by better-auth. 
2. **Participant Sessions Do Not Expire** -- Participant sessions should never expire, while staff sessions should expire after a sensible ammount of time. In order to ensure this is the case we manually adjust the expiry date of session cookies when they are created. We also rotate the participant session every so often, and send a new session cookie when we do. 
3. **Do not directly expose better-auth api endpoints** -- The better-auth documentation often assumes you are directly exposing the better-auth api routes. MindLAMP's custom session length handling means we should *not* expose the better-auth api routes. Instead they should always be called server side from express routes. When making a better-auth api call, you must propagate the cookies returned by better-auth to the express response if there is any possibility of the session changing.