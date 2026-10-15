import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { assistantOn } from '#tests/helpers/assistant'

test.group('Shopping assistant limits', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signed-out visitors are limited per browser, not shared', async ({ client, assert }) => {
    await assistantOn()
    const startBrowser = async () => {
      const started = await client
        .post(urlFor('assistant.conversations.store'))
        .withCsrfToken()
        .header('Accept', 'application/json')
      const body: { data: { id: string } } = started.body()
      return { id: body.data.id, session: started.session() }
    }
    const send = async (browser: Awaited<ReturnType<typeof startBrowser>>) => {
      const response = await client
        .post(urlFor('assistant.conversations.messages.store', { conversationId: browser.id }))
        .withSession(browser.session)
        .withCsrfToken()
        .header('Accept', 'application/json')
        .json({ kind: 'message', text: 'Hello', page: null })
      // Each browser keeps its own session, including the visitor token the limiter keys on.
      Object.assign(browser.session, response.session())
      return response
    }
    const a = await startBrowser()
    const b = await startBrowser()

    const allowed: number[] = []
    while (allowed.length < 30) {
      const response = await send(a)
      allowed.push(response.status())
    }
    const blocked = await send(a)
    const other = await send(b)

    assert.deepEqual(
      allowed,
      Array.from({ length: 30 }, () => 200)
    )
    assert.equal(blocked.status(), 429)
    assert.equal(other.status(), 200)
  })
})
