import QueueWork from '@adonisjs/queue/commands/queue_work'

export default class WorkerStart extends QueueWork {
  static commandName = 'worker:start'
  static description =
    'Start processing jobs from the queue, and exit once in-flight jobs have drained on Ctrl+C'

  async run() {
    try {
      await super.run()
    } finally {
      await this.terminate()
    }
  }
}
