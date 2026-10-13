import { BaseCommand, flags } from '@adonisjs/core/ace'
import concurrently, { type ConcurrentlyCommandInput } from 'concurrently'

/**
 * Runs the test suites the way CI does: unit and functional tests in one process and the
 * browser suite split into shards, all in parallel. Each process gets its own port, Vite HMR
 * port, SQLite file and attachments folder (see TEST_SHARD), so they share no state.
 */
export default class TestShards extends BaseCommand {
  static commandName = 'test:shards'
  static description = 'Run unit, functional and sharded browser tests in parallel, like CI'

  /**
   * Must match the browser matrix in .github/workflows/ci.yml to reproduce a CI shard.
   */
  @flags.number({ description: 'Number of browser shards', default: 3 })
  declare shards: number

  @flags.boolean({ description: 'Run only the browser shards' })
  declare browserOnly?: boolean

  async run() {
    if (!Number.isInteger(this.shards) || this.shards < 1) {
      this.logger.error('--shards must be a positive whole number')
      this.exitCode = 1
      return
    }

    const browser = Array.from({ length: this.shards }, (_, index) => ({
      name: `browser ${index + 1}/${this.shards}`,
      shard: `browser-${index + 1}`,
      command: `node ace test browser --shard=${index + 1}/${this.shards}`,
      // Passkey tests need a host name, not an IP, as the WebAuthn relying party.
      env: { HOST: 'localhost', NODE_OPTIONS: '--dns-result-order=ipv4first' },
    }))
    const runs = [
      ...(this.browserOnly
        ? []
        : [
            {
              name: 'unit + functional',
              shard: 'unit-functional',
              command: 'node ace test unit functional',
              env: { HOST: '127.0.0.1' },
            },
          ]),
      ...browser,
    ]

    // Ports start above the dev server's 3333 and Vite's default HMR port 24678.
    const commands: ConcurrentlyCommandInput[] = runs.map((run, index) => ({
      name: run.name,
      command: run.command,
      env: {
        ...run.env,
        TEST_SHARD: run.shard,
        PORT: String(3340 + index),
        VITE_HMR_PORT: String(24680 + index),
      },
    }))

    const { result } = concurrently(commands, {
      group: true,
      prefix: 'name',
      timings: true,
    })
    try {
      await result
      this.logger.success(`${commands.length} test runs passed`)
    } catch {
      this.logger.error('One or more test runs failed; see the output above')
      this.exitCode = 1
    }
  }
}
