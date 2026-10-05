import { BaseTransformer } from '@adonisjs/core/transformers'
import type Order from '#models/checkout/order'
import OrderAddressTransformer from '#transformers/checkout/order_address_transformer'
import OrderLineItemTransformer from '#transformers/checkout/order_line_item_transformer'

export default class SellerOrderTransformer extends BaseTransformer<Order> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'number',
        'email',
        'phoneNumber',
        'currencyCode',
        'financialStatus',
        'fulfillmentStatus',
        'totalAmount',
        'subtotalAmount',
        'discountAmount',
        'shippingAmount',
        'taxAmount',
        'note',
        'processedAt',
        'cancelledAt',
        'source',
        'lifecycleState',
        'reviewReason',
      ]),
      addresses: OrderAddressTransformer.transform(this.whenLoaded(this.resource.addresses)),
      lineItems: OrderLineItemTransformer.transform(this.whenLoaded(this.resource.lineItems)),
      attempt: this.resource.attempts?.[0]
        ? {
            id: this.resource.attempts[0].id,
            state: this.resource.attempts[0].state,
            provider: this.resource.attempts[0].provider,
            externalId: this.resource.attempts[0].externalId,
            needsReview: this.resource.attempts[0].needsReview,
            lastError: this.resource.attempts[0].lastError,
          }
        : null,
      shipment: this.resource.shipments?.[0]
        ? {
            state: this.resource.shipments[0].state,
            carrier: this.resource.shipments[0].carrier,
            trackingNumber: this.resource.shipments[0].trackingNumber,
            trackingUrl: this.resource.shipments[0].trackingUrl,
          }
        : null,
      payments: (this.resource.payments ?? []).map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        disposition: payment.disposition,
        externalId: payment.externalId,
      })),
      refunds: (this.resource.refunds ?? []).map((refund) => ({
        id: refund.id,
        paymentId: refund.paymentId,
        state: refund.state,
        amountMinor: refund.amountMinor,
        needsReview: refund.needsReview,
        lastError: refund.lastError,
        externalId: refund.externalId,
      })),
      notifications: (this.resource.notifications ?? []).map((notification) => ({
        id: notification.id,
        kind: notification.kind,
        state: notification.state,
        lastError: notification.lastError,
      })),
      activities: (this.resource.activities ?? []).map((activity) => ({
        id: activity.id,
        event: activity.event,
        createdAt: activity.createdAt,
        actorId: activity.actorId,
        details: activity.details,
      })),
    }
  }
}
