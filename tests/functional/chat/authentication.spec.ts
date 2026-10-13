import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { useChatServer } from '#tests/helpers/chat_socket'

test.group('Chat session authentication', (group) => {
  const chat = useChatServer(group)
  group.each.setup(() => testUtils.db().truncate())

  const { login, connect } = chat

  test('rejects guests even when they supply a forged user and token', async ({ assert }) => {
    const error = await connect({ auth: { token: 'forged', user: { id: 'admin', role: 'admin' } } })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
    assert.lengthOf(chat.identities(), 0)
  })

  test('rejects malformed session cookies', async ({ assert }) => {
    const error = await connect({ cookie: 'adonis-session=invalid', auth: { user: { id: '1' } } })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
  })

  for (const role of ['customer', 'staff', 'admin'] as const) {
    for (const transport of ['polling', 'websocket'] as const) {
      test(`accepts ${role} sessions over ${transport} without client user data`, async ({
        client,
        assert,
      }) => {
        const { user, cookie } = await login(client, role)
        assert.isUndefined(await connect({ cookie, transport }))
        assert.deepEqual(chat.identities(), [{ userId: user.id }])
      })
    }
  }

  test('replaces all forged identity fields with trusted session data', async ({
    client,
    assert,
  }) => {
    const { user, cookie } = await login(client)
    assert.isUndefined(
      await connect({
        cookie,
        auth: {
          user: {
            id: 'victim',
            username: 'forged',
            displayName: 'Forged Name',
            role: 'admin',
            metadata: { permission: 'all' },
          },
        },
      })
    )
    assert.deepEqual(chat.identities(), [{ userId: user.id }])
  })

  test('gives customers their own identity even with a forged staff role', async ({
    client,
    assert,
  }) => {
    const { user, cookie } = await login(client, 'customer')
    assert.isUndefined(await connect({ cookie, auth: { user: { id: 'staff', role: 'staff' } } }))
    assert.deepEqual(chat.identities(), [{ userId: user.id }])
  })

  test('rejects a session whose account was deleted', async ({ client, assert }) => {
    const { user, cookie } = await login(client)
    await user.delete()
    const error = await connect({ cookie })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
  })

  test('rejects destroyed sessions on subsequent connections', async ({ client, assert }) => {
    const { cookie, session } = await login(client)
    await session.store.destroy(session.sessionId)
    const error = await connect({ cookie })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
  })

  test('does not consume flash messages or change the session', async ({ client, assert }) => {
    const { cookie, session } = await login(client)
    const data = await session.store.read(session.sessionId)
    await session.store.write(session.sessionId, {
      ...data,
      [session.flashKey]: { success: 'Saved successfully' },
    })
    const before = structuredClone(await session.store.read(session.sessionId))
    assert.isUndefined(await connect({ cookie }))
    assert.deepEqual(await session.store.read(session.sessionId), before)
  })

  test('rejects cookies sent by another browser origin', async ({ client, assert }) => {
    const { cookie } = await login(client)
    const error = await connect({ cookie, origin: 'https://untrusted.example' })
    assert.equal(error?.message, 'Authentication failed: Invalid origin')
  })
})
