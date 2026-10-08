import { BaseTransformer } from '@adonisjs/core/transformers'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import type Order from '#models/checkout/order'
import type OrderMessage from '#models/chat/order_message'
import MessageTransformer from '#transformers/chat/message_transformer'

export default class ConversationTransformer extends BaseTransformer<{
  order: Order
  roomKey: string
  canSend: boolean
  messages: OrderMessage[]
  images: AttachmentLinkModel[]
}> {
  toObject() {
    return {
      orderId: this.resource.order.id,
      orderNumber: this.resource.order.number,
      lifecycleState: this.resource.order.lifecycleState,
      customerId: this.resource.order.userId,
      roomKey: this.resource.roomKey,
      canSend: this.resource.canSend,
      messages: MessageTransformer.transform(this.resource.messages, this.resource.images),
    }
  }
}
