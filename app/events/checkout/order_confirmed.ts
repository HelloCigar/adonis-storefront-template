import { BaseEvent } from '@adonisjs/core/events'

/**
 * A payment was accepted and the order confirmed. Dispatched after the settlement commits,
 * so listeners see the confirmed order. Listener failure never reverses the payment.
 */
export default class OrderConfirmed extends BaseEvent {
  constructor(public orderId: string) {
    super()
  }
}
