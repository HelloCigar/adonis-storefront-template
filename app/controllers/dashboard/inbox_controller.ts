import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import OrderChatService from '#services/chat/order_chat_service'
import ConversationTransformer from '#transformers/chat/conversation_transformer'
import ThreadTransformer from '#transformers/chat/thread_transformer'
import { inboxQueryValidator } from '#validators/chat/inbox'

@inject()
export default class InboxController {
  constructor(private chat: OrderChatService) {}

  async index({ inertia, request, auth, bouncer }: HttpContext) {
    await bouncer.with('ChatOrderPolicy').authorize('viewAny')
    const query = await request.validateUsing(inboxQueryValidator)
    const filter = query.filter ?? 'all'

    const viewable = async () => {
      const order = query.order ? await Order.find(query.order) : null
      return order && (await bouncer.with('ChatOrderPolicy').allows('view', order)) ? order : null
    }

    return inertia.render('inbox', {
      filter,
      threads: async () => ThreadTransformer.transform(await this.chat.threads(filter)),
      // The linked thread's header, for an order the list leaves out or filters away.
      openThread: async () => {
        const order = await viewable()
        const thread = order ? await this.chat.thread(order) : null
        return thread ? ThreadTransformer.transform(thread) : null
      },
      conversation: async () => {
        const order = await viewable()
        if (!order) return null
        const canSend = await bouncer.with('ChatOrderPolicy').allows('send', order)
        return ConversationTransformer.transform(
          await this.chat.open(order, auth.getUserOrFail(), canSend)
        )
      },
    })
  }
}
