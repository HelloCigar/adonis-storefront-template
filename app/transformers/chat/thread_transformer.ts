import { BaseTransformer } from '@adonisjs/core/transformers'
import type { ChatThread } from '#services/chat/order_chat_service'
import MessageTransformer from '#transformers/chat/message_transformer'

export default class ThreadTransformer extends BaseTransformer<ChatThread> {
  toObject() {
    const { order, lastMessage, unreadCount } = this.resource
    return {
      orderId: order.id,
      orderNumber: order.number,
      lifecycleState: order.lifecycleState,
      customerName: order.user?.fullName?.trim() || order.email,
      customerEmail: order.user?.email ?? order.email,
      placedAt: order.processedAt.toISO()!,
      lastMessage: lastMessage ? MessageTransformer.transform(lastMessage) : null,
      unreadCount,
    }
  }
}
