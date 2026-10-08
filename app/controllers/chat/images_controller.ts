import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import OrderChatService from '#services/chat/order_chat_service'

/** Chat photos are private to the order: its account holder and store staff. */
@inject()
export default class ImagesController {
  constructor(private chat: OrderChatService) {}

  async show({ params, response, bouncer }: HttpContext) {
    const order = await Order.findOrFail(params.orderId)
    await bouncer.with('ChatOrderPolicy').authorize('view', order)
    const image = await this.chat.image(order, params.id)
    if (!image) return response.notFound()

    const attachments = await app.container.make('jrmc.attachment')
    response.header('content-type', image.mimeType)
    // An id always names the same bytes; only the signed-in browser keeps a copy.
    response.header('cache-control', 'private, max-age=86400')
    return response.send(await attachments.read(image.toAttachment()))
  }
}
