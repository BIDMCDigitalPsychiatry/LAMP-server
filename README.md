# LAMP Server

[To learn more about the LAMP Platform, visit our documentation.](https://docs.lamp.digital/)

## Environment

| Name  | Required | Description  |
|---|---|---|
| `APP_GATEWAY`   |   |   |
| `CACHE_FLUSH_ALL`   |   |   |
| `CACHE_SIZE`   |   |   |
| `CDB`   |   |   |
| `DASHBOARD_URL`   | :heavy_check_mark:  |   |
| `DB`  | :heavy_check_mark:  |   |
| `DB_KEY`   |   |   |
| `NATS_SERVER`   | :heavy_check_mark:  |   |
| `PORT`   |   | The port number the server should listen on. Defaults to 3000.  |
| `PUSH_API_KEY`   |   |   |
| `PUSH_GATEWAY`   |   |   |
| `PUSH_GATEWAY_APIKEY`   |   |   |
| `REDIS_HOST`  | :heavy_check_mark:  |   |
| `ROOT_KEY`   | :heavy_check_mark:  |   |
| `SHUTDOWN_GRACEPERIOD_MS`   | | The number of milliseconds after the process receives a termination signal before forcibly closing connections.  |
| `SYSTEM_STATUS_API_KEY`   |   | If set, some of the system info endpoints (such as `/system/metrics` or `/system/version`) will require a `key` query parameter equal to this env var in order to access.  |
| `secret_key`   |   |   |

