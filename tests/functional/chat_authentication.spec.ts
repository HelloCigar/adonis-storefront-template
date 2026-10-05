import { createServer } from 'node:http'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { configProvider } from '@adonisjs/core'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ResolvedSessionConfig, SessionStoreContract } from '@adonisjs/session/types'
import { ChatEngine } from '@ravex/server'
import { Server } from 'socket.io'
import { io, type Socket } from 'socket.io-client'
import User, { type UserRole } from '#models/account/user'
import ChatUserMiddleware from '#middleware/chat/user_middleware'
import env from '#start/env'

const sessions: { sessionId: string; store: SessionStoreContract; flashKey: string }[] = []

async function login(client: ApiClient, role: UserRole = 'staff') {
  const user = await User.create({
    email: `${role}@example.com`,
    fullName: 'Store Staff',
    password: 'secret-password',
    role,
  })
  const response = await client.post('/login').withCsrfToken().redirects(0).json({
    email: user.email,
    password: 'secret-password',
  })
  response.assertStatus(302)
  // Japa deletes response sessions during teardown. Restore the real login
  // session so the subsequent network socket can authenticate like a browser.
  const config = await configProvider.resolve<ResolvedSessionConfig>(app, app.config.get('session'))
  if (!config || config.store !== 'memory') throw new Error('Chat tests require memory sessions')
  const session = {
    sessionId: response.cookie('adonis-session')!.value as string,
    store: config.stores.memory(new HttpContextFactory().create(), config),
    flashKey: response.request.sessionClient.flashKey,
  }
  await session.store.write(session.sessionId, response.session())
  sessions.push(session)
  const cookies = response.headers()['set-cookie']
  const cookie = (Array.isArray(cookies) ? cookies : [cookies])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.split(';')[0])
    .join('; ')
  return { user, cookie, session }
}

test.group('Chat session authentication', (group) => {
  let engine: ChatEngine
  let url: string
  const clients: Socket[] = []

  group.setup(async () => {
    const httpServer = createServer()
    const socketServer = new Server(httpServer, { serveClient: false })
    const middleware = await app.container.make(ChatUserMiddleware)
    socketServer.of('/').use((socket, next) => void middleware.handle(socket, next))
    engine = new ChatEngine(socketServer)
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const address = httpServer.address()
    if (!address || typeof address === 'string') throw new Error('Missing chat server address')
    url = `http://127.0.0.1:${address.port}`
  })
  group.teardown(async () => {
    engine.destroy()
    await engine.io.close()
  })
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(async () => {
    for (const socket of clients.splice(0)) socket.disconnect()
    for (const session of sessions.splice(0)) await session.store.destroy(session.sessionId)
  })

  function connect({
    cookie = '',
    auth = {},
    origin = env.get('APP_URL') ? new URL(env.get('APP_URL')!).origin : url,
    transport = 'websocket',
  }: {
    cookie?: string
    auth?: Record<string, unknown>
    origin?: string
    transport?: 'polling' | 'websocket'
  } = {}) {
    const socket = io(url, {
      auth,
      extraHeaders: { Cookie: cookie, Origin: origin },
      transports: [transport],
      reconnection: false,
      forceNew: true,
      timeout: 5000,
    })
    clients.push(socket)
    return new Promise<Error | undefined>((resolve) => {
      socket.once('connect', () => resolve(undefined))
      socket.once('connect_error', (error) => resolve(error))
    })
  }

  test('rejects guests even when they supply a forged user and token', async ({ assert }) => {
    const error = await connect({ auth: { token: 'forged', user: { id: 'admin', role: 'admin' } } })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
    assert.isUndefined(engine.getUser('admin'))
  })

  test('rejects malformed session cookies', async ({ assert }) => {
    const error = await connect({ cookie: 'adonis-session=invalid', auth: { user: { id: '1' } } })
    assert.equal(error?.message, 'Authentication failed: Invalid or missing session')
  })

  for (const role of ['staff', 'admin'] as const) {
    for (const transport of ['polling', 'websocket'] as const) {
      test(`accepts ${role} sessions over ${transport} without client user data`, async ({
        client,
        assert,
      }) => {
        const { user, cookie } = await login(client, role)
        assert.isUndefined(await connect({ cookie, transport }))
        assert.equal(engine.getUser(String(user.id))?.username, `user-${user.id}`)
        assert.equal(engine.getUser(String(user.id))?.displayName, user.fullName)
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
    const trusted = engine.getUser(String(user.id))
    assert.equal(trusted?.displayName, user.fullName)
    assert.isUndefined(trusted?.metadata)
    assert.notProperty(trusted!, 'role')
    assert.isUndefined(engine.getUser('victim'))
  })

  test('denies customers even with a forged staff role', async ({ client, assert }) => {
    const { cookie } = await login(client, 'customer')
    const error = await connect({ cookie, auth: { user: { id: 'staff', role: 'staff' } } })
    assert.equal(error?.message, 'Authorization failed: Store staff access required')
    assert.isUndefined(engine.getUser('staff'))
  })

  test('checks the current role on new connections', async ({ client, assert }) => {
    const { user, cookie } = await login(client)
    await user.merge({ role: 'customer' }).save()
    const error = await connect({ cookie })
    assert.equal(error?.message, 'Authorization failed: Store staff access required')
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
