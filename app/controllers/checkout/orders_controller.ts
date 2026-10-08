import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'
import OrderChatService from '#services/chat/order_chat_service'
import InvoiceService from '#services/checkout/invoice_service'
import StatusTransformer from '#transformers/checkout/status_transformer'
import ConversationTransformer from '#transformers/chat/conversation_transformer'

@inject()
export default class OrdersController {
  constructor(
    private access: OrderAccessService,
    private chat: OrderChatService,
    private invoices: InvoiceService
  ) {}
  async show({ params, auth, checkoutSession, inertia, response, bouncer }: HttpContext) {
    const order = await this.access.authorize(
      params.publicId,
      auth.user?.id,
      checkoutSession.orderGrant(params.publicId)
    )
    await order.load('addresses')
    await order.load('lineItems')
    await order.load('attempts', (q) => q.orderBy('id', 'desc'))
    await order.load('shipments')
    await order.load('refunds', (q) => q.orderBy('id', 'desc'))
    response.header('Cache-Control', 'private, no-store')
    response.header('Referrer-Policy', 'no-referrer')
    return inertia.render('checkout/order', {
      status: StatusTransformer.transform(order).depth(4),
      canClaim: !!auth.user && !order.userId,
      hasInvoice: this.invoices.isAvailable(order),
      // Only the account holder chats here; an order link alone never opens the thread.
      conversation: async () => {
        if (!auth.user || auth.user.id !== order.userId) return null
        const canSend = await bouncer.with('ChatOrderPolicy').allows('send', order)
        const thread = await this.chat.open(order, auth.user, canSend)
        return canSend || thread.messages.length ? ConversationTransformer.transform(thread) : null
      },
    })
  }
}
