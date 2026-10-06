import server from '@adonisjs/core/services/server'
import type { ApplicationService } from '@adonisjs/core/types'
import { ChatEngine } from '@ravex/server'
import { Server } from 'socket.io'
import ChatUserMiddleware from '#middleware/chat/user_middleware'

export default class ChatProvider {
  #io?: ChatEngine
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
    // Imported here: the guard loads models, which must not be evaluated before services boot.
    const { default: ChatOrderRoomMiddleware } =
      await import('#middleware/chat/order_room_middleware')
    const orderRooms = await this.app.container.make(ChatOrderRoomMiddleware)
    const io = new Server(nodeServer, { serveClient: false })
    // Ravex installs its user check during construction, so authenticate first.
    io.of('/').use((socket, next) => {
      void authMiddleware.handle(socket, next)
    })
    this.#io = orderRooms.install(io)

    this.app.container.singleton(ChatEngine, () => this.#io!)
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

    this.#io.destroy()
    this.#closing = this.#io.io.close()
    return this.#closing
  }
}
