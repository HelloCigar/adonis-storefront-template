import { BaseMail } from '@adonisjs/mail'
import { storeEmail } from '#config/mail'
import StoreSetting from '#models/settings/store_setting'
import type Order from '#models/checkout/order'
import type Shipment from '#models/checkout/shipment'
import type Notification from '#models/checkout/notification'

/** Matches the storefront's en-PH number and currency formatting. */
const locale = 'en-PH'

export default class OrderNotification extends BaseMail {
  constructor(
    private order: Order,
    private kind: Notification['kind'],
    private accessUrl: string,
    private shipment: Shipment | null,
    private notificationId: number,
    private invoice: { filename: string; content: Buffer } | null = null
  ) {
    super()
  }

  async prepare() {
    const settings = await StoreSetting.current()
    // Overrides the mailer's deployment-wide brandName with the name the store saved.
    const view = { ...this.viewData(), brandName: settings.effectiveStoreName }
    this.message
      .from(storeEmail, settings.effectiveStoreName)
      .replyTo(settings.effectiveContactEmail)
      .to(this.order.email)
      .subject(
        this.kind === 'receipt'
          ? `Payment received · ${this.order.number}`
          : this.kind === 'delivery'
            ? `Your order was delivered · ${this.order.number}`
            : `Your order has shipped · ${this.order.number}`
      )
      .messageId(`order-notification-${this.notificationId}@${new URL(this.accessUrl).hostname}`)
      .htmlView('emails/order_notification', view)
      .textView('emails/order_notification_text', view)
    if (this.invoice)
      this.message.attachData(this.invoice.content, {
        filename: this.invoice.filename,
        contentType: 'application/pdf',
      })
  }

  /** Both views receive display-ready values, so templates hold no formatting rules. */
  private viewData() {
    const money = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.order.currencyCode,
    })
    const order = this.order
    const shipment = this.shipment
    const totals = [
      { label: 'Subtotal', amount: money.format(order.subtotalAmount) },
      order.discountAmount > 0 && {
        label: order.discountCode ? `Discount (${order.discountCode})` : 'Discount',
        amount: `−${money.format(order.discountAmount)}`,
      },
      { label: 'Shipping', amount: money.format(order.shippingAmount) },
      order.taxAmount > 0 && { label: 'Tax', amount: money.format(order.taxAmount) },
    ].filter((row): row is { label: string; amount: string } => Boolean(row))

    return {
      kind: this.kind,
      invoiceAttached: this.invoice !== null,
      accessUrl: this.accessUrl,
      orderNumber: order.number,
      total: money.format(order.totalAmount),
      totals,
      items: (order.lineItems ?? []).map((item) => ({
        title: item.title,
        variant: item.variantTitle && item.variantTitle !== 'Default' ? item.variantTitle : null,
        quantity: item.quantity,
        unitPrice: money.format(item.unitPriceAmount),
        total: money.format(item.totalAmount),
      })),
      address:
        (order.addresses?.find((address) => address.type === 'shipping') ?? order.addresses?.[0])
          ?.displayLines ?? [],
      shipment: shipment
        ? {
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            trackingUrl: this.safeTrackingUrl(shipment.trackingUrl),
          }
        : null,
    }
  }

  /** Staff enter tracking links by hand; only HTTP(S) links are rendered as buttons. */
  private safeTrackingUrl(url: string | null) {
    if (!url) return null
    try {
      return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null
    } catch {
      return null
    }
  }
}
