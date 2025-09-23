# LAMP Server

[To learn more about the LAMP Platform, visit our documentation.](https://docs.lamp.digital/)

## Setup For Local Development

1. Run `npm install`
2. Copy `example.env` and rename the copy to `.env`
3. Fill out the required fields of the new `.env` file. `example.env` contains example values that work for local development.
4. Ensure that docker is installed and can be run without using `sudo`.
5. Ensure that mongodb is installed and running.
6. Run `npm run dev`. Take note of the administrator password the command will print out the first time it is run successfully.
7. Log into the server via the dashboard using "admin" as the e-mail, and the password from step 6.

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
| `PORT`   |   | The port number the server should listen on. Defaults to 3000.                                                                                                            |
| `PUSH_API_KEY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_API_KEY`.                                                                                                                       |
| `PUSH_GATEWAY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_URL`.                                                                                                                           |
| `PUSH_GATEWAY_APIKEY`   |   | **Deprecated**. Use `NOTIFICATION_SERVICE_API_KEY`.                                                                                                                       |
| `REDIS_HOST`  | :heavy_check_mark:  |                                                                                                                                                                           |
| `ROOT_KEY`   | :heavy_check_mark:  | An key used to encrypt credentials.                                                                                                                                       |
| `SHUTDOWN_GRACEPERIOD_MS`   | | The number of milliseconds after the process receives a termination signal before forcibly closing connections.                                                           |
| `SYSTEM_STATUS_API_KEY`   |   | If set, some of the system info endpoints (such as `/system/metrics` or `/system/version`) will require a `key` query parameter equal to this env var in order to access. |

