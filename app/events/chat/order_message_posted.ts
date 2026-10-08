import { BaseEvent } from '@adonisjs/core/events'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import type OrderMessage from '#models/chat/order_message'

/** A chat message was stored. Chat sockets broadcast it to the order's room. */
export default class OrderMessagePosted extends BaseEvent {
  constructor(
    public message: OrderMessage,
    public images: AttachmentLinkModel[]
  ) {
    super()
  }
}
