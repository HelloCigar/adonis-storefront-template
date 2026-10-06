import server from '@adonisjs/core/services/server'
import type { ApplicationService } from '@adonisjs/core/types'
import { Server } from 'socket.io'
import ChatUserMiddleware from '#middleware/chat/user_middleware'

export default class ChatProvider {
  #io?: Server
  #closing?: Promise<void>

  constructor(protected app: ApplicationService) {}

  /**
   * The process has been started
   */
  async ready() {
    if (this.app.getEnvironment() !== 'web') {
      return
    }

    const nodeServer = server.getNodeServer()
    if (!nodeServer) {
      throw new Error('Cannot start chat without an HTTP server')
    }

    const authMiddleware = await this.app.container.make(ChatUserMiddleware)
    // Imported here: the handler loads models, which must not be evaluated before services boot.
    const { default: ChatOrderRoomHandler } = await import('#sockets/chat/order_room_handler')
    const orderRooms = await this.app.container.make(ChatOrderRoomHandler)
    const io = new Server(nodeServer, { serveClient: false })
    // Socket.IO bypasses the HTTP router, so authenticate every connection here.
    io.of('/').use((socket, next) => {
      void authMiddleware.handle(socket, next)
    })
    orderRooms.install(io)
    this.#io = io

    this.app.container.singleton(Server, () => this.#io!)
    // Terminating hooks run before provider shutdown, in reverse order.
    // Close upgraded sockets before Adonis waits for the HTTP server to close.
    this.app.terminating(() => this.shutdown())
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    if (this.#closing) return this.#closing
    if (!this.#io) return

    this.#closing = this.#io.close()
    return this.#closing
  }
}
