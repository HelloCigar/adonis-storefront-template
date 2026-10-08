import { BaseTransformer } from '@adonisjs/core/transformers'
import type Order from '#models/checkout/order'
import OrderTransformer from '#transformers/checkout/order_transformer'

export default class StatusTransformer extends BaseTransformer<Order> {
  toObject() {
    const order = this.resource
    const attempt = order.attempts?.[0]
    const shipment = order.shipments?.[0]
    return {
      order: OrderTransformer.transform(order).depth(3),
      publicId: order.publicId!,
      lifecycleState: order.lifecycleState,
      amountMinor: order.totalMinor!,
      shippingMinor: order.shippingMinor!,
      discountMinor: order.discountMinor,
      paymentState: attempt?.state ?? null,
      reviewRequired: order.lifecycleState === 'review_required' || !!attempt?.needsReview,
      expiresAtMs: attempt?.expiresAtMs ?? null,
      closing: !!attempt?.closeReason,
      checkoutUrl:
        order.lifecycleState === 'pending_payment' &&
        attempt?.state === 'pending' &&
        !attempt.needsReview &&
        !attempt.closeReason &&
        attempt.expiresAtMs > Date.now()
          ? attempt.checkoutUrl
          : null,
      shipment: shipment
        ? {
            state: shipment.state,
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            trackingUrl: shipment.trackingUrl,
            shippedAt: shipment.shippedAt,
            deliveredAt: shipment.deliveredAt,
          }
        : null,
      refunds: (order.refunds ?? []).map((refund) => ({
        id: refund.id,
        amountMinor: refund.amountMinor,
        state: refund.state,
        createdAt: refund.createdAt,
      })),
    }
  }
}
