import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { BaseSerializer } from '@adonisjs/core/transformers'
import { Bouncer } from '@adonisjs/bouncer'
import limiter from '@adonisjs/limiter/services/main'
import type { Server, Socket } from 'socket.io'
import * as abilities from '#abilities/main'
import { policies } from '#generated/policies'
import User from '#models/account/user'
import Order from '#models/checkout/order'
import type OrderMessage from '#models/chat/order_message'
import OrderChatService, { maxMessageLength } from '#services/chat/order_chat_service'
import MessageTransformer from '#transformers/chat/message_transformer'

export type ChatErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'RATE_LIMITED' | 'INTERNAL'
export type ChatReply<T> =
  { ok: true; data: T } | { ok: false; error: { code: ChatErrorCode; message: string } }
type Ack<T> = (reply: ChatReply<T>) => void

/** Set on every socket by the session handshake; nothing else about the client is trusted. */
export interface ChatSocketData {
  userId: number
}
type ChatSocket = Socket<any, any, any, ChatSocketData>

class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string
  ) {
    super(message)
  }
}

/** Serializes transformer output for socket payloads, the same way Inertia props are. */
class SocketSerializer extends BaseSerializer<{ PaginationMetaData: Record<string, unknown> }> {
  wrap = undefined
  definePaginationMetaData(metaData: unknown) {
    return metaData as Record<string, unknown>
  }
}

const serializer = new SocketSerializer()
const notFound = () => new ChatError('NOT_FOUND', 'Conversation not found')

/**
 * Order chat over plain Socket.IO. Every room is one order (`order:<id>`): joining checks
 * order access, every message re-checks that the order still accepts messages, and a
 * message is stored before it is broadcast. Clients choose only the room and the text.
 *
 * Client → server (each takes an acknowledgement callback):
 *   order:join    { roomKey }          → { roomKey, messages }
 *   order:leave   { roomKey }
 *   message:send  { roomKey, body }    → message
 *   message:read  { roomKey }
 * Client → server (no acknowledgement): typing:start / typing:stop { roomKey }
 * Server → room: message:new, message:read { roomKey, side }, typing:start / typing:stop
 */
@inject()
export default class ChatOrderRoomHandler {
  constructor(private chat: OrderChatService) {}

  install(io: Server) {
    io.of('/').on('connection', (socket: ChatSocket) => {
      this.handle(socket, 'order:join', (payload) => this.join(socket, payload))
      this.handle(socket, 'order:leave', async (payload) => {
        const roomKey = this.roomKeyFrom(payload)
        if (roomKey) await socket.leave(roomKey)
        return null
      })
      this.handle(socket, 'message:send', (payload) => this.send(io, socket, payload))
      this.handle(socket, 'message:read', (payload) => this.read(socket, payload))
      for (const event of ['typing:start', 'typing:stop'] as const) {
        socket.on(event, (payload: unknown) => void this.typing(socket, event, payload))
      }
    })
  }

  private async join(socket: ChatSocket, payload: unknown) {
    const { order } = await this.access(socket, payload, 'view')
    const roomKey = this.chat.roomKey(order)
    await socket.join(roomKey)
    const messages = await this.chat.messages(order.id)
    return { roomKey, messages: await Promise.all(messages.map((m) => this.serialize(m))) }
  }

  private async send(io: Server, socket: ChatSocket, payload: unknown) {
    const roomKey = this.memberRoom(socket, payload)
    const raw = (payload as { body?: unknown } | undefined)?.body
    const body = typeof raw === 'string' ? raw.trim() : ''
    if (!body) throw new ChatError('VALIDATION', 'Write a message first')
    if (body.length > maxMessageLength) {
      throw new ChatError('VALIDATION', `Messages can be up to ${maxMessageLength} characters`)
    }

    const allowed = await limiter
      .use({ requests: 30, duration: '1 minute' })
      .attempt(`chat_send_${socket.data.userId}`, () => true)
    if (!allowed) throw new ChatError('RATE_LIMITED', 'You are sending messages too quickly')

    const { user, order } = await this.access(socket, { roomKey }, 'send')
    const message = await this.chat.post({ order, sender: user, body })
    const data = { roomKey, ...(await this.serialize(message)) }
    io.to(roomKey).emit('message:new', data)
    return data
  }

  private async read(socket: ChatSocket, payload: unknown) {
    const roomKey = this.memberRoom(socket, payload)
    const { user, order } = await this.access(socket, { roomKey }, 'view')
    await this.chat.markRead(order, user)
    socket.to(roomKey).emit('message:read', { roomKey, side: this.chat.sideFor(user, order) })
    return null
  }

  private async typing(
    socket: ChatSocket,
    event: 'typing:start' | 'typing:stop',
    payload: unknown
  ) {
    const roomKey = this.roomKeyFrom(payload)
    if (!roomKey || !socket.rooms.has(roomKey)) return
    const orderId = this.chat.orderIdFromRoomKey(roomKey)
    const order = orderId ? await Order.find(orderId) : null
    if (!order) return
    const side = order.userId === socket.data.userId ? 'customer' : 'staff'
    socket.to(roomKey).emit(event, { roomKey, side })
  }

  /** Runs one acknowledged event and turns every failure into a `{ ok: false }` reply. */
  private handle<T>(socket: ChatSocket, event: string, run: (payload: unknown) => Promise<T>) {
    socket.on(event, async (payload: unknown, ack?: Ack<T>) => {
      const reply = typeof ack === 'function' ? ack : () => {}
      try {
        reply({ ok: true, data: await run(payload) })
      } catch (error) {
        if (error instanceof ChatError) {
          return reply({ ok: false, error: { code: error.code, message: error.message } })
        }
        logger.error({ err: error, event }, 'order chat event failed')
        reply({ ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } })
      }
    })
  }

  /** Loads the current account and order and checks the policy again on every call. */
  private async access(socket: ChatSocket, payload: unknown, action: 'view' | 'send') {
    const orderId = this.chat.orderIdFromRoomKey(this.roomKeyFrom(payload))
    const [user, order] = await Promise.all([
      User.find(socket.data.userId),
      orderId ? Order.find(orderId) : null,
    ])
    if (!user || !order) throw notFound()
    const bouncer = new Bouncer(user, abilities, policies)
    if (!(await bouncer.with('ChatOrderPolicy').allows('view', order))) throw notFound()
    if (action === 'send' && !(await bouncer.with('ChatOrderPolicy').allows('send', order))) {
      throw new ChatError('FORBIDDEN', 'Messages are closed for this order')
    }
    return { user, order }
  }

  private memberRoom(socket: ChatSocket, payload: unknown) {
    const roomKey = this.roomKeyFrom(payload)
    if (!roomKey || !socket.rooms.has(roomKey)) throw notFound()
    return roomKey
  }

  private roomKeyFrom(payload: unknown) {
    const roomKey = (payload as { roomKey?: unknown } | undefined)?.roomKey
    return typeof roomKey === 'string' ? roomKey : null
  }

  private serialize(message: OrderMessage) {
    return serializer.serialize(
      MessageTransformer.transform(message),
      app.container.createResolver()
    )
  }
}
