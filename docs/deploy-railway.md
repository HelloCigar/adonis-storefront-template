# Deploying on Railway

The repository deploys with Railway's default Railpack build: no `railway.json`, Dockerfile or custom commands. Railpack installs dependencies, runs `npm run build` and starts the service with `npm start`.

`npm start` runs [`scripts/start.mjs`](../scripts/start.mjs), which:

1. Runs pending migrations from `build/`.
2. Starts the web server and the queue worker for `maintenance,payments,notifications` in the same container. SQLite on a volume cannot be shared between services, so the worker cannot be a separate Railway service.
3. Stops both processes on SIGTERM, and exits with an error if either one exits on its own so Railway restarts the deployment.

Migrations run in the start command, not a pre-deploy command, because Railway does not mount volumes during pre-deploy.

## One-time setup

1. Create a service from the GitHub repository.
2. Attach a volume to the service at any mount path, for example `/data`. The launcher uses `RAILWAY_VOLUME_MOUNT_PATH` as `DATA_DIR`, which holds `db.sqlite3` and `attachments/`. Without a volume the launcher refuses to start, because `build/` is recreated on every deploy and would lose every order and upload.
3. Add the `APP_KEY` variable. Generate one locally with `node ace generate:key --show`. Keep it stable: changing it signs everyone out and invalidates encrypted values.
4. Generate a public domain. The launcher sets `APP_URL` to `https://$RAILWAY_PUBLIC_DOMAIN` unless `APP_URL` is set, so set it yourself when using a custom domain.
5. Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=100` so payment jobs, which can run for 90 seconds, settle before Railway force-stops the old deployment.
6. For checkout and email, add the PayMongo and SMTP variables from [`.env.example`](../.env.example) and configure the webhook as described in [checkout operations](checkout-operations.md#deployment).

Keep the service at one replica. Railway does not allow replicas on a service with a volume, and the app expects a single SQLite writer.

## Defaults the launcher fills in

Each applies only when the variable is unset.

| Variable                        | Default                          |
| ------------------------------- | -------------------------------- |
| `NODE_ENV`                      | `production`                     |
| `HOST`                          | `0.0.0.0`                        |
| `LOG_LEVEL`                     | `info`                           |
| `SESSION_DRIVER`                | `cookie`                         |
| `QUEUE_DRIVER`, `LIMITER_STORE` | `database`                       |
| `DATA_DIR`                      | `RAILWAY_VOLUME_MOUNT_PATH`      |
| `APP_URL`                       | `https://$RAILWAY_PUBLIC_DOMAIN` |
| `TRUST_PROXY`                   | `true` on Railway                |

`TRUST_PROXY` trusts exactly one proxy hop, so the client IP used by rate limits is the rightmost `X-Forwarded-For` entry that Railway's edge appends, not a value the client can spoof.

## Node version

Railpack picks the newest Node release that satisfies `engines.node` (`>=24.0.0`), while CI tests Node 24. If the build fails compiling `better-sqlite3`, set `RAILPACK_NODE_VERSION=24` on the service.
