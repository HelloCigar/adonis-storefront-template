import { BaseTransformer } from '@adonisjs/core/transformers'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import type OrderMessage from '#models/chat/order_message'

/**
 * Uses the public id so live and loaded copies of a message are the same. `images` may
 * hold links for a whole thread; only this message's are used. Image URLs go through the
 * chat route, which checks order access on every request. `automated` marks a message the
 * store posted without a sender account, such as the order thank-you.
 */
export default class MessageTransformer extends BaseTransformer<OrderMessage> {
  constructor(
    resource: OrderMessage,
    private images: AttachmentLinkModel[] = []
  ) {
    super(resource)
  }

  toObject() {
    const messageId = String(this.resource.id)
    return {
      id: this.resource.publicId,
      body: this.resource.body,
      senderName: this.resource.senderName,
      senderRole: this.resource.senderRole,
      automated: this.resource.senderId === null,
      createdAt: this.resource.createdAt.toISO()!,
      read: this.resource.readAt !== null,
      images: this.images
        .filter((link) => link.attachableId === messageId)
        .map(({ attachment }) => ({
          id: attachment.id,
          url: urlFor('chat.images.show', { orderId: this.resource.orderId, id: attachment.id }),
          name: attachment.originalName,
          mimeType: attachment.mimeType,
          width: attachment.metadata?.dimension?.width ?? null,
          height: attachment.metadata?.dimension?.height ?? null,
        })),
    }
  }
}
