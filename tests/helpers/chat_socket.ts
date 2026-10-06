import { createServer } from 'node:http'
import type { ApiClient } from '@japa/api-client'
import { configProvider } from '@adonisjs/core'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import app from '@adonisjs/core/services/app'
import type { ResolvedSessionConfig, SessionStoreContract } from '@adonisjs/session/types'
import { Server } from 'socket.io'
import { io, type Socket } from 'socket.io-client'
import User, { type UserRole } from '#models/account/user'
import ChatOrderRoomHandler, { type ChatReply } from '#sockets/chat/order_room_handler'
import ChatUserMiddleware from '#middleware/chat/user_middleware'
import env from '#start/env'

interface OpenOptions {
  cookie?: string
  auth?: Record<string, unknown>
  origin?: string
  transport?: 'polling' | 'websocket'
}

/**
 * A real chat server wired like the provider: session authentication first, then the
 * order room handler. Tests connect over the network like a browser.
 */
export async function startChatServer() {
  const httpServer = createServer()
  const socketServer = new Server(httpServer, { serveClient: false })
  const auth = await app.container.make(ChatUserMiddleware)
  socketServer.of('/').use((socket, next) => void auth.handle(socket, next))
  const orderRooms = await app.container.make(ChatOrderRoomHandler)
  orderRooms.install(socketServer)
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing chat server address')
  const url = `http://127.0.0.1:${address.port}`
  const sockets: Socket[] = []
  const sessions: { sessionId: string; store: SessionStoreContract; flashKey: string }[] = []
  const defaultOrigin = env.get('APP_URL') ? new URL(env.get('APP_URL')!).origin : url

  function open(options: OpenOptions = {}) {
    const socket = io(url, {
      auth: options.auth ?? {},
      extraHeaders: { Cookie: options.cookie ?? '', Origin: options.origin ?? defaultOrigin },
      transports: [options.transport ?? 'websocket'],
      reconnection: false,
      forceNew: true,
      timeout: 5000,
    })
    sockets.push(socket)
    return socket
  }

  return {
    io: socketServer,
    url,

    /** Server-side identity of every connected socket. */
    identities() {
      return [...socketServer.of('/').sockets.values()].map((socket) => socket.data)
    },

    async login(client: ApiClient, user: User | UserRole = 'staff') {
      const account =
        typeof user === 'string'
          ? await User.create({
              email: `${user}@example.com`,
              fullName: user === 'customer' ? 'Casey Customer' : 'Store Staff',
              password: 'secret-password',
              role: user,
            })
          : user
      if (typeof user !== 'string') await account.merge({ password: 'secret-password' }).save()
      const response = await client.post('/login').withCsrfToken().redirects(0).json({
        email: account.email,
        password: 'secret-password',
      })
      response.assertStatus(302)
      // Japa deletes response sessions during teardown. Restore the real login
      // session so the subsequent network socket can authenticate like a browser.
      const config = await configProvider.resolve<ResolvedSessionConfig>(
        app,
        app.config.get('session')
      )
      if (!config || config.store !== 'memory')
        throw new Error('Chat tests require memory sessions')
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
      return { user: account, cookie, session }
    },

    connect(options: OpenOptions = {}) {
      const socket = open(options)
      return new Promise<Error | undefined>((resolve) => {
        socket.once('connect', () => resolve(undefined))
        socket.once('connect_error', (error) => resolve(error))
      })
    },

    /** Opens a socket that must connect, for tests about what happens after login. */
    async connected(cookie: string) {
      const socket = open({ cookie })
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve)
        socket.once('connect_error', reject)
      })
      return socket
    },

    async disconnectAll() {
      for (const socket of sockets.splice(0)) socket.disconnect()
      for (const session of sessions.splice(0)) await session.store.destroy(session.sessionId)
      // Wait for the server to notice, so the next test starts with no sockets.
      for (let attempt = 0; socketServer.of('/').sockets.size && attempt < 40; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    },

    close() {
      return socketServer.close()
    },
  }
}

export type ChatServer = Awaited<ReturnType<typeof startChatServer>>

/** Emits with an acknowledgement and resolves with the `{ ok, data | error }` reply. */
export function request<T>(socket: Socket, event: string, payload?: unknown) {
  return new Promise<ChatReply<T>>((resolve, reject) => {
    const reply = (error: Error | null, response: ChatReply<T>) =>
      error ? reject(error) : resolve(response)
    socket.timeout(5000).emit(event, payload, reply)
  })
}

/** Resolves with the next payload of `event`, or undefined if none arrives in time. */
export function nextEvent<T>(socket: Socket, event: string, timeoutMs = 300) {
  return new Promise<T | undefined>((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, listener)
      resolve(undefined)
    }, timeoutMs)
    const listener = (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    }
    socket.once(event, listener)
  })
}
