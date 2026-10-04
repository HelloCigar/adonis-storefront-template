import { BaseMail } from '@adonisjs/mail'
import type Order from '#models/checkout/order'
import type Shipment from '#models/checkout/shipment'

export default class OrderNotification extends BaseMail {
  constructor(
    private order: Order,
    private kind: 'receipt' | 'shipment',
    private accessUrl: string,
    private shipment: Shipment | null,
    private notificationId: number
  ) {
    super()
  }
  prepare() {
    this.message
      .to(this.order.email)
      .subject(
        this.kind === 'receipt'
          ? `Payment received · ${this.order.number}`
          : `Your order has shipped · ${this.order.number}`
      )
      .messageId(`order-notification-${this.notificationId}@${new URL(this.accessUrl).hostname}`)
      .htmlView('emails/order_notification', {
        order: this.order,
        kind: this.kind,
        accessUrl: this.accessUrl,
        shipment: this.shipment,
      })
      .textView('emails/order_notification_text', {
        order: this.order,
        kind: this.kind,
        accessUrl: this.accessUrl,
        shipment: this.shipment,
      })
  }
}
