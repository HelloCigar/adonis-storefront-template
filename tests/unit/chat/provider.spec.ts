import { createServer } from 'node:http'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import type { ApplicationService } from '@adonisjs/core/types'
import { ChatEngine } from '@ravex/server'
import ChatProvider from '#providers/chat_provider'

test('chat termination closes active WebSocket transports before provider shutdown', async ({
  assert,
  cleanup,
}) => {
  const httpServer = createServer()
  const getNodeServer = server.getNodeServer
  server.getNodeServer = () => httpServer
  cleanup(() => {
    server.getNodeServer = getNodeServer
  })

  let terminate: (() => void | Promise<void>) | undefined
  const providerApp = {
    getEnvironment: () => 'web',
    container: app.container,
    terminating: (hook: () => void | Promise<void>) => {
      terminate = hook
    },
  } as unknown as ApplicationService
  const provider = new ChatProvider(providerApp)
  cleanup(() => provider.shutdown())
  await provider.ready()
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing chat server address')

  // Hold an upgraded Engine.IO transport open, without sending a namespace login.
  const socket = new WebSocket(
    `ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`
  )
  cleanup(() => socket.close())
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true })
    socket.addEventListener('error', () => reject(new Error('WebSocket failed')), { once: true })
  })
  const engine = await app.container.make(ChatEngine)
  assert.equal(engine.io.engine.clientsCount, 1)
  assert.isFunction(terminate)
  await terminate!()
  assert.isFalse(httpServer.listening)
  assert.equal(engine.io.engine.clientsCount, 0)
  await provider.shutdown()
}).timeout(5000)
