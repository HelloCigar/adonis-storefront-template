import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PaymentService from '#services/payments/payment_service'
import SettlementService from '#services/payments/settlement_service'
import RefundService from '#services/payments/refund_service'
import RefundLookupService from '#services/payments/refund_lookup_service'
import PaymentException from '#exceptions/payment_exception'

@inject()
export default class WebhooksController {
  constructor(
    private payments: PaymentService,
    private settlement: SettlementService,
    private refunds: RefundService,
    private lookups: RefundLookupService
  ) {}
  async store({ params, request, response }: HttpContext) {
    const rawBody = request.raw()
    if (rawBody === null)
      throw new PaymentException('Missing payment webhook body', {
        code: 'E_PAYMENT_WEBHOOK_PAYLOAD',
        status: 400,
      })
    const event = await this.payments.parseWebhook({
      provider: params.provider,
      rawBody,
      headers: request.headers(),
    })
    switch (event.type) {
      case 'checkout.paid':
        await this.settlement.apply(event.checkout)
        break
      case 'refund.updated':
        await this.refunds.apply(event.refund)
        break
      case 'refund.reconcile':
        await this.lookups.request(event.refund, event.liveMode, event.id)
        break
      case 'payment.refunds_changed':
        await this.refunds.reconcilePayment(event.provider, event.payment.id, event.liveMode)
        break
    }
    return response.ok({ received: true })
  }
}
