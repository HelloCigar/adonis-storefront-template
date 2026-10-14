import { BaseCommand, flags } from '@adonisjs/core/ace'
import { EnvLoader, EnvParser } from '@adonisjs/core/env'
import type { ConcurrentlyCommandInput } from 'concurrently'

/**
 * How `node ace test` starts the runner. The runs start it directly: `node ace test` picks
 * its own free Vite HMR port, and parallel runs racing for the same one break the browser's
 * HMR connection. Each run also regenerating .adonisjs at once would race on those files.
 */
const testRunner = 'node --import=@poppinss/ts-exec --enable-source-maps bin/test.ts'

/**
 * Runs the test suites the way CI does: unit and functional tests in one process and the
 * browser suite split into shards, all in parallel. Each process gets its own port, Vite HMR
 * port, SQLite file and attachments folder (see TEST_SHARD), so they share no state.
 * Codegen runs once, before the tests start.
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
      command: `${testRunner} browser --shard=${index + 1}/${this.shards}`,
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
              command: `${testRunner} unit functional`,
              env: { HOST: '127.0.0.1' },
            },
          ]),
      ...browser,
    ]

    // This process loaded .env into process.env, and inherited values would win over
    // .env.test in the runs. Leave them out so each run loads its env files itself.
    const loaded: Record<string, undefined> = {}
    for (const file of await new EnvLoader(this.app.appRoot).load()) {
      const values = await new EnvParser(file.contents, this.app.appRoot).parse()
      for (const key of Object.keys(values)) loaded[key] = undefined
    }

    // Ports start above the dev server's 3333 and Vite's default HMR port 24678.
    const commands: ConcurrentlyCommandInput[] = runs.map((run, index) => ({
      name: run.name,
      command: run.command,
      env: {
        ...loaded,
        ...run.env,
        NODE_ENV: 'test',
        TEST_SHARD: run.shard,
        PORT: String(3340 + index),
        VITE_HMR_PORT: String(24680 + index),
      },
    }))

    // Development dependencies, so `node ace` still loads where they are not installed.
    const { CodeGen } = await import('@adonisjs/assembler')
    const { default: concurrently } = await import('concurrently')
    const codegen = new CodeGen(this.app.appRoot, { hooks: this.app.rcFile.hooks })
    codegen.ui.logger = this.logger
    await codegen.run()

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
