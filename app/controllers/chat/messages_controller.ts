import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import OrderChatService from '#services/chat/order_chat_service'
import { imageMessageValidator } from '#validators/chat/message'

/**
 * Photos, with an optional caption, sent as one chat message. Text-only messages go over
 * the chat socket; both reach the order's room through the same broadcast.
 */
@inject()
export default class MessagesController {
  constructor(private chat: OrderChatService) {}

  async store({ params, request, response, auth, bouncer }: HttpContext) {
    const order = await Order.findOrFail(params.orderId)
    await bouncer.with('ChatOrderPolicy').authorize('send', order)
    const { body, images } = await request.validateUsing(imageMessageValidator)
    await this.chat.post({ order, sender: auth.getUserOrFail(), body: body ?? '', images })
    return response.redirect().back()
  }
}
