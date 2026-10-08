import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { attachmentManager } from '@jrmc/adonis-attachment'
import { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import OrderMessagePosted from '#events/chat/order_message_posted'
import type User from '#models/account/user'
import Order from '#models/checkout/order'
import OrderMessage, { type ChatSide } from '#models/chat/order_message'

const roomPrefix = 'order:'
const threadLimit = 100
const messageLimit = 200
export const maxMessageLength = 2000
export const maxImagesPerMessage = 4

export const inboxFilters = ['all', 'unread'] as const
export type InboxFilter = (typeof inboxFilters)[number]

export interface ChatThread {
  order: Order
  lastMessage: OrderMessage | null
  unreadCount: number
}

export default class OrderChatService {
  /** The Socket.IO room for an order. Access is checked again on every join. */
  roomKey(order: Pick<Order, 'id'>) {
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

  /** The newest messages, returned oldest first for display, with their images. */
  async messages(orderId: number) {
    const newestFirst = await OrderMessage.query()
      .where('order_id', orderId)
      .orderBy('id', 'desc')
      .limit(messageLimit)
    const messages = newestFirst.reverse()
    return { messages, images: await this.imagesFor(messages) }
  }

  /**
   * Stores a message and its images together, then announces it to the order's room.
   * A failed upload rolls the message back, so a message never appears without its images.
   */
  async post(input: { order: Order; sender: User; body: string; images?: MultipartFile[] }) {
    const message = await OrderMessage.transaction(async (trx) => {
      const row = new OrderMessage().useTransaction(trx).merge({
        publicId: randomUUID(),
        orderId: input.order.id,
        senderId: input.sender.id,
        senderRole: this.sideFor(input.sender, input.order),
        senderName: input.sender.fullName?.trim() || input.sender.email,
        body: input.body,
      })
      if (input.images?.length) {
        row.images.addMany(await attachmentManager.createFromFiles(input.images))
      }
      return row.save()
    })
    const images = input.images?.length ? await message.images.all() : []
    await OrderMessagePosted.dispatch(message, images)
    return { message, images }
  }

  /**
   * Image links for many messages in one query, in each message's upload order. Lucid
   * stores the owner id as text, so match on the stringified message id.
   */
  async imagesFor(messages: OrderMessage[]) {
    if (!messages.length) return []
    return AttachmentLinkModel.query()
      .where('attachable_type', OrderMessage.table)
      .where('field', 'images')
      .whereIn(
        'attachable_id',
        messages.map((message) => String(message.id))
      )
      .preload('attachment')
      .orderBy('position', 'asc')
  }

  /** The stored image, if it was sent in this order's chat. Access is the caller's job. */
  async image(order: Order, attachmentId: string) {
    const links = await AttachmentLinkModel.query()
      .where('attachable_type', OrderMessage.table)
      .where('field', 'images')
      .where('attachment_id', attachmentId)
      .preload('attachment')
    if (!links.length) return null
    const message = await order
      .related('messages')
      .query()
      .whereIn(
        'id',
        links.map((link) => Number(link.attachableId))
      )
      .first()
    return links.find((link) => link.attachableId === String(message?.id))?.attachment ?? null
  }

  /** Marks everything the other side sent as read by the reader's side. */
  async markRead(order: Order, reader: User) {
    await order
      .related('messages')
      .query()
      .whereNot('sender_role', this.sideFor(reader, order))
      .whereNull('read_at')
      .update({ read_at: this.toSql(new Date()) })
  }

  /** Opening a thread reads it; access is the caller's responsibility. */
  async open(order: Order, reader: User, canSend: boolean) {
    await this.markRead(order, reader)
    return { order, roomKey: this.roomKey(order), canSend, ...(await this.messages(order.id)) }
  }

  /**
   * Staff inbox: confirmed account orders, plus any older thread whose order has since
   * left that state. Most recent conversation first, then newest orders.
   */
  async threads(filter: InboxFilter = 'all'): Promise<ChatThread[]> {
    const query = Order.query()
      .whereNotNull('user_id')
      .where((scope) => scope.where('lifecycle_state', 'confirmed').orHas('messages'))
      .withAggregate('messages', (messages) => messages.max('created_at').as('last_message_at'))
      .withCount('messages', (messages) =>
        messages.where('sender_role', 'customer').whereNull('read_at').as('unread_count')
      )
      .preload('user')
      // The latest message per order, still in one preload query.
      .preload('messages', (messages) => messages.groupOrderBy('id', 'desc').groupLimit(1))
      .orderByRaw('last_message_at IS NULL, last_message_at DESC, orders.id DESC')
      .limit(threadLimit)
    if (filter === 'unread') {
      query.whereHas('messages', (messages) =>
        messages.where('sender_role', 'customer').whereNull('read_at')
      )
    }

    const orders = await query
    return orders.map((order) => ({
      order,
      lastMessage: order.messages[0] ?? null,
      unreadCount: Number(order.$extras.unread_count ?? 0),
    }))
  }

  /** Matches how Lucid stores DateTime columns, so raw comparisons sort correctly. */
  private toSql(date: Date) {
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss')
  }
}
