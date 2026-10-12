import { isUlid } from '#models/shared/with_ulid_primary_key'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { attachmentManager } from '@jrmc/adonis-attachment'
import { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import StoreSetting from '#models/settings/store_setting'
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

/** Where an order stands, in the words staff use in the inbox header and order queue. */
export type ChatOrderStage =
  | 'awaiting_payment'
  | 'needs_attention'
  | 'to_pack'
  | 'to_ship'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'expired'

export interface ChatThread {
  order: Order
  stage: ChatOrderStage
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
    const id = key.slice(roomPrefix.length)
    return isUlid(id) ? id : null
  }

  /** An admin who bought the order still writes as its customer. */
  sideFor(user: User, order: Order): ChatSide {
    return order.userId === user.id ? 'customer' : 'staff'
  }

  /** The newest messages, returned oldest first for display, with their images. */
  async messages(orderId: string) {
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
   * The store's thank-you that opens a confirmed account order's chat. It has no sender
   * account and is written on the staff side. Only an empty thread gets one, so a repeated
   * call never posts it twice. Guest orders have no chat.
   */
  async thankForOrder(order: Order) {
    if (!order.userId || order.lifecycleState !== 'confirmed') return null
    if (await order.related('messages').query().first()) return null
    await order.load('user')
    const settings = await StoreSetting.current()
    const name = order.user.firstName?.trim() || order.user.fullName?.trim().split(/\s+/)[0]
    const message = await OrderMessage.create({
      publicId: randomUUID(),
      orderId: order.id,
      senderId: null,
      senderRole: 'staff',
      senderName: settings.effectiveStoreName,
      body:
        `Thanks for ordering${name ? `, ${name}` : ''}! We received your payment for order ` +
        `${order.number} and will post updates here. Reply anytime if you have a question.`,
    })
    await OrderMessagePosted.dispatch(message, [])
    return message
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
        messages.map((message) => message.id)
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
        links.map((link) => link.attachableId)
      )
      .first()
    return links.find((link) => link.attachableId === message?.id)?.attachment ?? null
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
    const query = this.threadQuery()
      .where((scope) => scope.where('lifecycle_state', 'confirmed').orHas('messages'))
      .orderByRaw('last_message_at IS NULL, last_message_at DESC, orders.id DESC')
      .limit(threadLimit)
    if (filter === 'unread') {
      query.whereHas('messages', (messages) =>
        messages.where('sender_role', 'customer').whereNull('read_at')
      )
    }
    const orders = await query
    return orders.map((order) => this.toThread(order))
  }

  /**
   * One order's thread, even when the inbox list leaves it out (an older order, or a
   * cancelled one nobody wrote in). Access is the caller's responsibility.
   */
  async thread(order: Pick<Order, 'id'>): Promise<ChatThread | null> {
    const found = await this.threadQuery().where('orders.id', order.id).first()
    return found ? this.toThread(found) : null
  }

  /** Customer messages staff have not opened yet. */
  async unreadCount(order: Order) {
    const counted = await order
      .related('messages')
      .query()
      .where('sender_role', 'customer')
      .whereNull('read_at')
      .count('* as total')
      .first()
    return Number(counted?.$extras.total ?? 0)
  }

  /**
   * The fulfillment step an order is on. Online orders follow their shipment; manually
   * recorded orders only have their payment and fulfillment statuses to go on.
   */
  stage(order: Order): ChatOrderStage {
    const state = order.lifecycleState
    if (state === 'review_required') return 'needs_attention'
    if (state === 'cancelled' || state === 'expired') return state
    if (order.source === 'legacy') {
      if (order.cancelledAt) return 'cancelled'
      if (order.fulfillmentStatus === 'fulfilled') return 'delivered'
      return order.financialStatus === 'paid' ? 'to_pack' : 'awaiting_payment'
    }
    if (state === 'pending_payment') return 'awaiting_payment'
    switch (order.shipments?.[0]?.state) {
      case 'packing':
        return 'to_ship'
      case 'shipped':
        return 'in_transit'
      case 'delivered':
        return 'delivered'
      case 'cancelled':
        return 'cancelled'
      default:
        return 'to_pack'
    }
  }

  private threadQuery() {
    return (
      Order.query()
        .whereNotNull('user_id')
        .withAggregate('messages', (messages) => messages.max('created_at').as('last_message_at'))
        .withCount('messages', (messages) =>
          messages.where('sender_role', 'customer').whereNull('read_at').as('unread_count')
        )
        .preload('user')
        .preload('shipments', (shipments) => shipments.groupOrderBy('id', 'desc').groupLimit(1))
        // The latest message per order, still in one preload query.
        .preload('messages', (messages) => messages.groupOrderBy('id', 'desc').groupLimit(1))
    )
  }

  private toThread(order: Order): ChatThread {
    return {
      order,
      stage: this.stage(order),
      lastMessage: order.messages[0] ?? null,
      unreadCount: Number(order.$extras.unread_count ?? 0),
    }
  }

  /** Matches how Lucid stores DateTime columns, so raw comparisons sort correctly. */
  private toSql(date: Date) {
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss')
  }
}
