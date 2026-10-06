import Order from '#models/checkout/order'
import OrderChatService from '#services/chat/order_chat_service'
import OrderTransformer from '#transformers/checkout/order_transformer'
import ConversationTransformer from '#transformers/chat/conversation_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class OrdersController {
  constructor(private chat: OrderChatService) {}

  async index({ auth, inertia, bouncer }: HttpContext) {
    await bouncer.with('AccountOrderPolicy').authorize('viewAny', auth.getUserOrFail())
    return inertia.render('account/orders/index', {
      orders: async () =>
        OrderTransformer.transform(
          await Order.query()
            .where('user_id', auth.user!.id)
            .preload('lineItems')
            .preload('addresses')
            .orderBy('processed_at', 'desc')
        ),
    })
  }

  async show({ auth, params, inertia, bouncer, response }: HttpContext) {
    const order = await Order.query()
      .where('id', params.id)
      .where('user_id', auth.user!.id)
      .preload('lineItems')
      .preload('addresses')
      .firstOrFail()
    await bouncer.with('AccountOrderPolicy').authorize('view', order)
    if (order.source === 'online')
      return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })

    return inertia.render('account/orders/[id]', {
      order: OrderTransformer.transform(order),
      conversation: async () => {
        const canSend = await bouncer.with('ChatOrderPolicy').allows('send', order)
        const thread = await this.chat.open(order, auth.getUserOrFail(), canSend)
        return canSend || thread.messages.length ? ConversationTransformer.transform(thread) : null
      },
    })
  }
}
