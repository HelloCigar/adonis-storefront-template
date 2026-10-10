import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { apiClient } from '@japa/api-client'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { shieldApiClient } from '@adonisjs/shield/plugins/api_client'
import { inertiaApiClient } from '@adonisjs/inertia/plugins/api_client'
import { browserClient, decoratorsCollection } from '@japa/browser-client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Server-rendered pages show their markup before Vue hydrates it, so a click right after
 * `visit()` can land on a button that has no listeners yet. Wait for the app to mount.
 */
decoratorsCollection.register({
  context(context) {
    const visit = context.visit
    context.visit = (async (...args: Parameters<typeof visit>) => {
      const result = await visit(...args)
      // Only `visit(url)` hands back the page; page-class visits manage their own waits.
      if (typeof args[0] === 'string') {
        const page = result as unknown as Awaited<ReturnType<typeof context.newPage>>
        await page.waitForFunction(
          `!document.querySelector('[data-server-rendered]') || !!document.getElementById('app')?.__vue_app__`
        )
      }
      return result
    }) as typeof visit
  },
})

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
  shieldApiClient(),
  inertiaApiClient(app),
  browserClient({ runInSuites: ['browser'] }),
  sessionBrowserClient(app),
  authBrowserClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  // truncate() migrates up and, on teardown, empties every table instead of running
  // migration:reset; the agent runtime migrations are forward-only and refuse down().
  setup: [() => testUtils.db().truncate()],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  // Every test shares one client IP; start each with fresh rate-limit counters.
  const clearRateLimits = async () => {
    const { default: limiter } = await import('@adonisjs/limiter/services/main')
    await limiter.clear()
  }
  suite.onTest((test) => test.setup(clearRateLimits))
  suite.onGroup((group) => group.each.setup(clearRateLimits))
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
