/*
|--------------------------------------------------------------------------
| Production launcher
|--------------------------------------------------------------------------
|
| `npm start` after `npm run build`. Runs pending migrations, then the web
| server and the queue worker against the same SQLite database, and stops
| both when either exits or the platform sends SIGTERM. One container runs
| both because a SQLite file on a volume cannot be shared across services.
|
| On Railway it fills in defaults from the platform: the volume mount path
| becomes DATA_DIR, the public domain becomes APP_URL, and the edge proxy
| is trusted for client IPs. Set any variable explicitly to override it.
|
*/

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const buildDir = fileURLToPath(new URL('../build/', import.meta.url))
const env = { ...process.env }

function fail(message) {
  console.error(`[start] ${message}`)
  process.exit(1)
}

function setDefault(name, value) {
  if (!env[name] && value) env[name] = value
}

if (!existsSync(`${buildDir}bin/server.js`)) {
  fail('build/bin/server.js is missing. Run `npm run build` first.')
}

const onRailway = Boolean(env.RAILWAY_ENVIRONMENT_ID)

setDefault('NODE_ENV', 'production')
setDefault('HOST', '0.0.0.0')
setDefault('PORT', '3333')
setDefault('LOG_LEVEL', 'info')
setDefault('SESSION_DRIVER', 'cookie')
setDefault('QUEUE_DRIVER', 'database')
setDefault('LIMITER_STORE', 'database')
setDefault('DATA_DIR', env.RAILWAY_VOLUME_MOUNT_PATH)
if (env.RAILWAY_PUBLIC_DOMAIN) setDefault('APP_URL', `https://${env.RAILWAY_PUBLIC_DOMAIN}`)
if (onRailway) setDefault('TRUST_PROXY', 'true')

if (!env.APP_KEY) {
  fail('APP_KEY is not set. Generate one with `node ace generate:key --show` and add it.')
}

// `node ace build` empties build/, so the default tmp/ and storage/ paths do not survive a deploy.
if (env.NODE_ENV === 'production' && !env.DATA_DIR) {
  fail(
    onRailway
      ? 'No volume is attached. Attach a volume to this service so orders and uploads persist.'
      : 'DATA_DIR is not set. Point it at a persistent directory for the database and uploads.'
  )
}
if (env.DATA_DIR) mkdirSync(env.DATA_DIR, { recursive: true })

function run(args) {
  return spawn(process.execPath, args, { cwd: buildDir, env, stdio: 'inherit' })
}

const migration = run(['ace', 'migration:run', '--force'])
const migrationCode = await new Promise((resolve) => migration.on('exit', resolve))
if (migrationCode !== 0) fail(`Migrations failed with exit code ${migrationCode}.`)

const children = [
  run(['bin/server.js']),
  run(['ace', 'queue:work', '--queue=maintenance,payments,notifications', '--concurrency=1']),
]

let stopping = false
let exitCode = 0

function stop(code) {
  if (!stopping) exitCode = code
  stopping = true
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  }
}

for (const child of children) {
  child.on('exit', (code) => {
    // Either process exiting on its own stops the other, so the platform restarts both.
    if (!stopping) stop(code || 1)
    if (children.every((c) => c.exitCode !== null || c.signalCode !== null)) {
      process.exit(exitCode)
    }
  })
}

process.on('SIGTERM', () => stop(0))
process.on('SIGINT', () => stop(0))
