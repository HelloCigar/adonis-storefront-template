import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type User from '#models/account/user'
import Order from '#models/checkout/order'
import OrderMessage, { type ChatSide } from '#models/chat/order_message'

const roomPrefix = 'order:'
const threadLimit = 100
const messageLimit = 200
export const maxMessageLength = 2000

export const inboxFilters = ['all', 'unread'] as const
export type InboxFilter = (typeof inboxFilters)[number]

export interface ChatThread {
  order: Order
  lastMessage: OrderMessage | null
  unreadCount: number
}

export default class OrderChatService {
  /** The Socket.IO room for an order. Access is checked again on every join. */
  roomKey(order: Order) {
    return `${roomPrefix}${order.id}`
  }

  orderIdFromRoomKey(key: unknown) {
    if (typeof key !== 'string' || !key.startsWith(roomPrefix)) return null
    const id = Number(key.slice(roomPrefix.length))
    return Number.isSafeInteger(id) && id > 0 ? id : null
  }

  /** An admin who bought the order still writes as its customer. */
  sideFor(user: User, order: Order): ChatSide {
    return order.userId === user.id ? 'customer' : 'staff'
  }

  /** The newest messages, returned oldest first for display. */
  async messages(orderId: number) {
    const newestFirst = await OrderMessage.query()
      .where('order_id', orderId)
      .orderBy('id', 'desc')
      .limit(messageLimit)
    return newestFirst.reverse()
  }

  async post(input: { order: Order; sender: User; body: string }) {
    return OrderMessage.create({
      publicId: randomUUID(),
      orderId: input.order.id,
      senderId: input.sender.id,
      senderRole: this.sideFor(input.sender, input.order),
      senderName: input.sender.fullName?.trim() || input.sender.email,
      body: input.body,
    })
  }

  /** Marks everything the other side sent as read by the reader's side. */
  async markRead(order: Order, reader: User) {
    await OrderMessage.query()
      .where('order_id', order.id)
      .whereNot('sender_role', this.sideFor(reader, order))
      .whereNull('read_at')
      .update({ read_at: this.toSql(new Date()) })
  }

  /** Opening a thread reads it; access is the caller's responsibility. */
  async open(order: Order, reader: User, canSend: boolean) {
    await this.markRead(order, reader)
    return { order, roomKey: this.roomKey(order), canSend, messages: await this.messages(order.id) }
  }

  /**
   * Staff inbox: confirmed account orders, plus any older thread whose order has since
   * left that state. Most recent conversation first, then newest orders.
   */
  async threads(filter: InboxFilter = 'all'): Promise<ChatThread[]> {
    const lastAt = db
      .from('order_messages')
      .whereColumn('order_messages.order_id', 'orders.id')
      .max('created_at')
    const unreadMessages = () =>
      db
        .from('order_messages')
        .whereColumn('order_messages.order_id', 'orders.id')
        .where('sender_role', 'customer')
        .whereNull('read_at')
    const query = Order.query()
      .whereNotNull('orders.user_id')
      .where((scope) =>
        scope
          .where('lifecycle_state', 'confirmed')
          .orWhereExists((messages) =>
            messages.from('order_messages').whereColumn('order_messages.order_id', 'orders.id')
          )
      )
      .select('orders.*')
      .select(lastAt.as('last_message_at'), unreadMessages().count('*').as('unread_count'))
      .preload('user')
      .orderByRaw('last_message_at IS NULL, last_message_at DESC, orders.id DESC')
      .limit(threadLimit)
    if (filter === 'unread') query.whereExists(unreadMessages().select('id'))
    const orders = await query

    const latest = new Map<number, OrderMessage>()
    if (orders.length) {
      const rows = await OrderMessage.query().whereIn(
        'id',
        db
          .from('order_messages')
          .whereIn(
            'order_id',
            orders.map((order) => order.id)
          )
          .groupBy('order_id')
          .max('id')
      )
      for (const row of rows) latest.set(row.orderId, row)
    }

    return orders.map((order) => ({
      order,
      lastMessage: latest.get(order.id) ?? null,
      unreadCount: Number(order.$extras.unread_count ?? 0),
    }))
  }

  /** Matches how Lucid stores DateTime columns, so raw comparisons sort correctly. */
  private toSql(date: Date) {
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss')
  }
}
