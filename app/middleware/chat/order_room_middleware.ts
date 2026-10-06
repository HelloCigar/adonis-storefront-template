import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Bouncer } from '@adonisjs/bouncer'
import { ChatEngine, ChatError, ErrorCodes, type SocketData } from '@ravex/server'
import type { Event, Server, Socket } from 'socket.io'
import * as abilities from '#abilities/main'
import { policies } from '#generated/policies'
import User from '#models/account/user'
import Order from '#models/checkout/order'
import { ChatSaver, type ChatMessage } from '#models/adapters/chat_adapter'
import OrderChatService, { maxMessageLength, messageLimit } from '#services/chat/order_chat_service'

type ChatUser = SocketData['user']
type Ack = (response: { ok: false; error: { code: string; message: string } }) => void

/** Events Ravex already scopes to the sender, or to rooms the sender is a member of. */
const passthrough = new Set([
  'presence:ping',
  'presence:status',
  'room:leave',
  'room:list',
  'room:members',
  'typing:start',
  'typing:stop',
])

/**
 * Ravex lets any connected socket create, join, or react in any room. Customers share the
 * socket with staff, so every client event passes through here first: rooms exist only
 * for orders, joining needs order access, and a message is stored before it is broadcast.
 */
@inject()
export default class ChatOrderRoomMiddleware {
  #engine?: ChatEngine
  #rooms = new Map<number, string>()

  constructor(private chat: OrderChatService) {}

  /** Builds the engine around an authenticated Socket.IO server and guards each socket. */
  install(io: Server) {
    const engine = new ChatEngine(io, {
      persistence: new ChatSaver(this.chat, (roomId) => this.orderIdFor(roomId)),
      messageMiddleware: [(message, user) => this.beforeSend(message, user)],
      message: { maxMessageLength, allowEdits: false, allowDeletes: false },
      onRead: (userId, _messageId, roomId) => void this.markRead(userId, roomId),
    })
    this.#engine = engine
    // Registered after Ravex's own listener, so every packet still meets this guard first.
    engine.io.of('/').on('connection', (socket) => {
      socket.use((packet, next) => void this.handle(socket, packet, next))
    })
    return engine
  }

  orderIdFor(roomId: unknown) {
    if (typeof roomId !== 'string') return null
    const orderId = this.#engine?.getRoom(roomId)?.metadata?.orderId
    return typeof orderId === 'number' ? orderId : null
  }

  async handle(socket: Socket, packet: Event, next: (error?: Error) => void) {
    const [event, payload] = packet as [string, Record<string, unknown> | undefined]
    const last = packet[packet.length - 1]
    const ack: Ack | undefined = typeof last === 'function' ? last : undefined
    const deny = (code: string, message: string) => ack?.({ ok: false, error: { code, message } })

    try {
      if (passthrough.has(event)) return next()

      if (event === 'room:join') {
        const order = await this.authorize(socket, this.chat.orderIdFromRoomKey(payload?.roomId))
        if (!order) return deny(ErrorCodes.ROOM_NOT_FOUND, 'Conversation not found')
        packet[1] = { roomId: this.ensureRoom(order) }
        return next()
      }

      const roomId = payload?.roomId
      const orderId = this.orderIdFor(roomId)
      if (!orderId) return deny(ErrorCodes.ROOM_NOT_FOUND, 'Conversation not found')

      if (event === 'message:send') {
        const content = typeof payload?.content === 'string' ? payload.content.trim() : ''
        if (!content) return deny(ErrorCodes.VALIDATION, 'Write a message first')
        // Text only: no client-chosen type, attachments, replies, or metadata.
        packet[1] = { roomId, content }
        return next()
      }

      if (event === 'message:history') {
        if (!(await this.authorize(socket, orderId))) {
          return deny(ErrorCodes.ROOM_NOT_FOUND, 'Conversation not found')
        }
        const limit = Number(payload?.limit)
        const before = typeof payload?.before === 'string' ? payload.before : undefined
        packet[1] = {
          roomId,
          limit:
            Number.isInteger(limit) && limit > 0 ? Math.min(limit, messageLimit) : messageLimit,
          before: before && !Number.isNaN(Date.parse(before)) ? before : undefined,
        }
        return next()
      }

      if (event === 'message:read') {
        const user: ChatUser | undefined = socket.data.user
        const member = user && this.#engine?.getRoom(roomId as string)?.members.includes(user.id)
        if (member && typeof payload?.messageId === 'string') return next()
        return
      }

      return deny(ErrorCodes.FORBIDDEN, 'This action is not available')
    } catch (error) {
      logger.error({ err: error, event }, 'chat event guard failed')
      return deny(ErrorCodes.INTERNAL, 'Something went wrong')
    }
  }

  /** Re-checks access and stores the message; nothing is broadcast if either fails. */
  async beforeSend(message: ChatMessage, chatUser: ChatUser) {
    const orderId = this.orderIdFor(message.roomId)
    const [user, order] = await Promise.all([
      User.find(Number(chatUser.id)),
      orderId ? Order.find(orderId) : null,
    ])
    if (
      !user ||
      !order ||
      !(await this.bouncer(user).with('ChatOrderPolicy').allows('send', order))
    ) {
      throw new ChatError('Messages are closed for this order', ErrorCodes.FORBIDDEN)
    }
    const stored = await this.chat.post({
      publicId: message.id,
      order,
      sender: user,
      body: message.content,
      sentAt: message.createdAt,
    })
    message.senderName = stored.senderName
    message.metadata = { senderRole: stored.senderRole }
  }

  private async markRead(userId: string, roomId: string) {
    try {
      const order = await this.authorizeUser(
        await User.find(Number(userId)),
        this.orderIdFor(roomId)
      )
      if (order) await this.chat.markRead(order.order, order.user)
    } catch (error) {
      logger.error({ err: error }, 'chat read receipt failed')
    }
  }

  private async authorize(socket: Socket, orderId: number | null) {
    const user: ChatUser | undefined = socket.data.user
    const found = await this.authorizeUser(user ? await User.find(Number(user.id)) : null, orderId)
    return found?.order ?? null
  }

  private async authorizeUser(user: User | null, orderId: number | null) {
    if (!user || !orderId) return null
    const order = await Order.find(orderId)
    if (!order || !(await this.bouncer(user).with('ChatOrderPolicy').allows('view', order))) {
      return null
    }
    return { user, order }
  }

  /** Engine rooms live in memory; recreate one per order after a restart. */
  private ensureRoom(order: Order) {
    const engine = this.#engine!
    const existing = this.#rooms.get(order.id)
    if (existing && engine.getRoom(existing)) return existing
    const room = engine.createRoom({
      type: 'group',
      name: `Order ${order.number}`,
      // No account id is "system", so nobody administers order rooms from a client.
      createdBy: 'system',
      isPrivate: true,
      metadata: { orderId: order.id },
    })
    this.#rooms.set(order.id, room.id)
    return room.id
  }

  private bouncer(user: User) {
    return new Bouncer(user, abilities, policies)
  }
}
