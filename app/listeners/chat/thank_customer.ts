import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type OrderConfirmed from '#events/checkout/order_confirmed'
import Order from '#models/checkout/order'
import OrderChatService from '#services/chat/order_chat_service'

/** Opens a confirmed account order's chat with a thank-you from the store. */
@inject()
export default class ThankCustomer {
  constructor(private chat: OrderChatService) {}

  async handle(event: OrderConfirmed) {
    try {
      const order = await Order.find(event.orderId)
      if (order) await this.chat.thankForOrder(order)
    } catch (error) {
      logger.error({ err: error, orderId: event.orderId }, 'Order thank-you chat message failed')
    }
  }
}
