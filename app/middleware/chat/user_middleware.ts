import { ServerResponse } from 'node:http'
import { configProvider } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import { Session } from '@adonisjs/session'
import type { ResolvedSessionConfig } from '@adonisjs/session/types'
import type { Socket } from 'socket.io'
import checkout from '#config/checkout'
import type { ChatSocketData } from '#sockets/chat/order_room_handler'

export default class ChatUserMiddleware {
  async handle(socket: Socket, next: (error?: Error) => void) {
    try {
      // Socket.IO bypasses the HTTP router middleware pipeline.
      const request = socket.request
      const origin = request.headers.origin
      if (origin) {
        const allowedOrigin = checkout.publicUrl
          ? new URL(checkout.publicUrl).origin
          : `${app.inProduction ? 'https' : 'http'}://${request.headers.host}`
        if (new URL(origin).origin !== allowedOrigin) {
          return next(new Error('Authentication failed: Invalid origin'))
        }
      }

      const response = new ServerResponse(request)
      const ctx = server.createHttpContext(
        server.createRequest(request, response),
        server.createResponse(request, response),
        app.container.createResolver()
      )
      const config = await configProvider.resolve<ResolvedSessionConfig>(
        app,
        app.config.get('session')
      )
      if (!config?.enabled) {
        return next(new Error('Authentication failed: Session authentication is unavailable'))
      }

      ctx.session = new Session(
        config,
        config.stores[config.store],
        await app.container.make('emitter'),
        ctx
      )
      // Do not consume flash messages or write cookies during a socket handshake.
      await ctx.session.initiate(true)
      const authManager = await app.container.make('auth.manager')
      ctx.auth = authManager.createAuthenticator(ctx)
      // Customers connect too; each order room checks access when joined.
      const user = await ctx.auth.use('web').authenticate()

      // Only the session decides identity; handshake auth data from the client is ignored.
      socket.data = { userId: user.id } satisfies ChatSocketData
    } catch {
      return next(new Error('Authentication failed: Invalid or missing session'))
    }

    return next()
  }
}
