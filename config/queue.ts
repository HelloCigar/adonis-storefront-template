import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/queue'

export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'database'),

  adapters: {
    database: drivers.database({
      connectionName: 'sqlite',
    }),
    sync: drivers.sync(),
  },

  worker: {
    concurrency: 1,
    idleDelay: '2s',
    stalledThreshold: '60s',
    stalledInterval: '30s',
    maxStalledCount: 1,
    gracefulShutdown: true,
  },

  locations: ['./app/jobs/**/*.{ts,js}'],
})
