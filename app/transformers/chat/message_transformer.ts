import { BaseTransformer } from '@adonisjs/core/transformers'
import type OrderMessage from '#models/chat/order_message'

/** Uses the engine's message id so live and loaded copies of a message are the same. */
export default class MessageTransformer extends BaseTransformer<OrderMessage> {
  toObject() {
    return {
      id: this.resource.publicId,
      body: this.resource.body,
      senderName: this.resource.senderName,
      senderRole: this.resource.senderRole,
      createdAt: this.resource.createdAt.toISO()!,
      read: this.resource.readAt !== null,
    }
  }
}
