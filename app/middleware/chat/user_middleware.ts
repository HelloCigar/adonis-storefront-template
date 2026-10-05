import { ServerResponse } from 'node:http'
import { configProvider } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import { Session } from '@adonisjs/session'
import type { ResolvedSessionConfig } from '@adonisjs/session/types'
import type { Socket } from 'socket.io'
import env from '#start/env'

export default class ChatUserMiddleware {
  async handle(socket: Socket, next: (error?: Error) => void) {
    try {
      // Socket.IO bypasses the HTTP router middleware pipeline.
      const request = socket.request
      const origin = request.headers.origin
      if (origin) {
        const appUrl = env.get('APP_URL')
        const allowedOrigin = appUrl
          ? new URL(appUrl).origin
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
      const user = await ctx.auth.use('web').authenticate()
      if (!user.isStoreStaff) {
        return next(new Error('Authorization failed: Store staff access required'))
      }

      // Replace every client-supplied field before Ravex copies this into socket.data.
      socket.handshake.auth.user = {
        id: String(user.id),
        username: `user-${user.id}`,
        displayName: user.fullName ?? undefined,
      }
    } catch {
      return next(new Error('Authentication failed: Invalid or missing session'))
    }

    return next()
  }
}
