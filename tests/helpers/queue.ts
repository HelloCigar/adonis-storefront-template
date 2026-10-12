import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { getActiveTest, getActiveTestOrFail, timeTravel } from '@japa/runner'
import { QueueManager, Worker } from '@adonisjs/queue'

/**
 * A worker on the real database queue, as the production worker process runs it. Stopped
 * when the active test ends.
 */
export function databaseWorker() {
  const adapter = QueueManager.use('database')
  const worker = new Worker({
    default: 'database',
    adapters: { database: () => adapter },
    autoLoadJobs: false,
    jobFactory: async (JobClass) => app.container.make(JobClass),
    worker: {
      concurrency: 1,
      idleDelay: 10,
      stalledThreshold: 1000,
      stalledInterval: 10,
      maxStalledCount: 1,
      gracefulShutdown: false,
    },
  })
  getActiveTest()?.cleanup(() => worker.stop())
  return worker
}

/**
 * Moves the clock past the longest retry delay of the payment and notification jobs
 * (2 minutes for payments, 5 for notifications), so a failed job is due again.
 */
export function passRetryDelay(minutes = 2) {
  timeTravel(new Date(Date.now() + minutes * 60_000 + 10_000))
}

/**
 * Makes the queue store refuse new jobs until `restore()` is called or the test ends, as
 * when the queue database is unreachable.
 */
export function failQueuePublishing() {
  const adapter = QueueManager.use('database')
  const { pushOn, pushLaterOn } = adapter
  const refuse = async () => {
    throw new Error('Queue unavailable')
  }
  adapter.pushOn = refuse
  adapter.pushLaterOn = refuse
  const restore = () => {
    adapter.pushOn = pushOn
    adapter.pushLaterOn = pushLaterOn
  }
  getActiveTestOrFail().cleanup(restore)
  return { restore }
}

/** Jobs waiting in the queue store, in the shape a worker would read them. */
export async function queuedJobs(queue: string) {
  const rows = await db
    .from('queue_jobs')
    .where('queue', queue)
    .whereIn('status', ['pending', 'delayed'])
  return rows.map((row) => {
    const { name, payload } = JSON.parse(row.data) as { name: string; payload: unknown }
    return { name, payload }
  })
}

/** Names of the jobs waiting in the queue store, sorted. */
export async function queuedJobNames(queue: string) {
  const jobs = await queuedJobs(queue)
  return jobs.map((job) => job.name).sort()
}

/**
 * A worker takes the next job on `queue` and dies without finishing it, so the job stays
 * claimed until another worker notices it has stalled.
 */
export async function abandonNextJob(queue: string) {
  const job = await QueueManager.use('database').popFrom(queue)
  if (!job) throw new Error(`No job waiting on the ${queue} queue`)
  await db.from('queue_jobs').where('id', job.id).update({ acquired_at: 0 })
}

/** The queue store loses every waiting job, as when a queue database is restored or wiped. */
export async function loseQueuedJobs() {
  await db.from('queue_jobs').whereIn('status', ['pending', 'delayed']).delete()
}

/**
 * Runs every job that is due on the given queues, including jobs those jobs dispatch, and
 * returns once the queues are idle. Delayed jobs and retries stay queued until they are due.
 */
export async function runQueue(queues: string[]) {
  const worker = databaseWorker()
  const completed: string[] = []
  for (;;) {
    const cycle = await worker.processCycle(queues)
    if (!cycle || cycle.type === 'idle') break
    if (cycle.type === 'error') throw cycle.error
    if (cycle.type === 'completed') completed.push(cycle.job.name)
  }
  await worker.stop()
  return completed
}
