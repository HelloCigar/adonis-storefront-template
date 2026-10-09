# Deploying on Railway

The repository deploys with Railway's default Railpack build: no `railway.json`, Dockerfile or custom commands. Railpack installs dependencies, runs `npm run build` and starts the service with `npm start`, which runs pending migrations and then the compiled server from `build/`.

Migrations run in the start command, not a pre-deploy command, because Railway does not mount volumes during pre-deploy.

## One-time setup

1. Create a service from the GitHub repository.
2. Attach a volume to the service, for example at `/data`, and set `DATA_DIR` to the same path. It holds `db.sqlite3` and `attachments/`. Without it they stay under `build/`, which every deploy recreates, so orders and uploads would be lost.
3. Generate a public domain.
4. Add these variables:

   | Variable                        | Value                                                    |
   | ------------------------------- | -------------------------------------------------------- |
   | `NODE_ENV`                      | `production`                                             |
   | `HOST`                          | `0.0.0.0`                                                |
   | `LOG_LEVEL`                     | `info`                                                   |
   | `APP_KEY`                       | Output of `node ace generate:key --show`; keep it stable |
   | `APP_URL`                       | `https://${{RAILWAY_PUBLIC_DOMAIN}}` or your domain      |
   | `SESSION_DRIVER`                | `cookie`                                                 |
   | `QUEUE_DRIVER`, `LIMITER_STORE` | `database`                                               |
   | `DATA_DIR`                      | The volume mount path                                    |
   | `TRUST_PROXY`                   | `true`                                                   |

   `TRUST_PROXY` trusts exactly one proxy hop, so the client IP used by rate limits is the rightmost `X-Forwarded-For` entry that Railway's edge appends, not Railway's own address or a value the client can spoof.

5. For checkout and email, add the PayMongo and SMTP variables from [`.env.example`](../.env.example) and configure the webhook as described in [checkout operations](checkout-operations.md#deployment).

Keep the service at one replica. Railway does not allow replicas on a service with a volume, and the app expects a single SQLite writer.

## Queue worker

`npm start` runs only the web server. Payments, notifications and the outbox relay need the worker from [checkout operations](checkout-operations.md#deployment) running against the same database. A volume belongs to one service, so with SQLite the worker has to run in the same container as the web server.

## Node version

Railpack picks the newest Node release that satisfies `engines.node` (`>=24.0.0`), while CI tests Node 24. If the build fails compiling `better-sqlite3`, set `RAILPACK_NODE_VERSION=24` on the service.
