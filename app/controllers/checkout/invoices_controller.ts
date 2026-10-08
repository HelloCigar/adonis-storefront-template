import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'
import InvoiceService from '#services/checkout/invoice_service'
import CheckoutException from '#exceptions/checkout_exception'

/** The invoice PDF for a paid order, open to whoever may view the order page. */
@inject()
export default class InvoicesController {
  constructor(
    private access: OrderAccessService,
    private invoices: InvoiceService
  ) {}
  async show({ params, auth, checkoutSession, response }: HttpContext) {
    const order = await this.access.authorize(
      params.publicId,
      auth.user?.id,
      checkoutSession.orderGrant(params.publicId)
    )
    if (!this.invoices.isAvailable(order)) {
      throw new CheckoutException('Invoice not found', 'E_INVOICE_NOT_FOUND', 404)
    }
    const pdf = await this.invoices.render(order)
    response
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${this.invoices.filename(order)}"`)
      .header('Cache-Control', 'private, no-store')
      .header('Referrer-Policy', 'no-referrer')
    return response.send(pdf)
  }
}
