import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DateTime } from 'luxon'
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
        'discountCode',
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
            shippedAt: this.resource.shipments[0].shippedAt,
            deliveredAt: this.resource.shipments[0].deliveredAt,
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
      timeline: this.timeline(),
    }
  }

  /** Activity events and customer emails as one history, newest first. */
  private timeline() {
    const events = (this.resource.activities ?? []).map((activity) => ({
      id: `activity:${activity.id}`,
      type: 'event' as const,
      title: activityTitles[activity.event] ?? humanize(activity.event),
      at: moment(activity.createdAt),
      actor: activity.actor
        ? activity.actor.fullName || activity.actor.email
        : activity.actorId
          ? 'Staff member'
          : null,
      details: (activity.details ?? null) as Record<string, unknown> | null,
      email: null,
      viaCopilot: activity.viaCopilot,
      // The link outlives nothing: once retention removes the conversation, only the mark stays.
      copilotConversationId: activity.copilotProposal?.conversationId ?? null,
    }))
    const emails = (this.resource.notifications ?? []).map((notification) => ({
      id: `email:${notification.id}`,
      type: 'email' as const,
      title: `${humanize(notification.kind)} email`,
      at: moment(notification.sentAt ?? notification.createdAt),
      actor: null,
      details: null,
      email: {
        notificationId: notification.id,
        kind: notification.kind,
        state: notification.state,
        lastError: notification.lastError,
      },
      viaCopilot: false,
      copilotConversationId: null,
    }))
    // Times are stored to the second; ULID ids keep creation order within the same second.
    const ulid = (id: string) => id.slice(id.indexOf(':') + 1)
    return [...events, ...emails].sort((a, b) =>
      a.at.raw === b.at.raw
        ? ulid(b.id).localeCompare(ulid(a.id))
        : b.at.raw.localeCompare(a.at.raw)
    )
  }
}

const activityTitles: Record<string, string> = {
  'order.created': 'Order placed',
  'order.submitted': 'Order placed',
  'order.confirmed': 'Order confirmed',
  'order.cancelled': 'Order cancelled',
  'shipment.packing': 'Packing started',
  'shipment.shipped': 'Shipment recorded',
  'shipment.delivered': 'Delivery recorded',
  'notification.retry_requested': 'Customer update retry requested',
  'payment.accepted': 'Payment confirmed',
  'refund.requested': 'Refund requested',
  'refund.succeeded': 'Refund confirmed',
  'refund.failed': 'Refund failed',
  'order.cancellation_requested': 'Cancellation requested',
}

const humanize = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())

/** Store time is Philippine time, matching how the rest of the order page shows dates. */
const moment = (value: DateTime) => ({
  raw: value.toUTC().toISO()!,
  formatted: value
    .setZone('Asia/Manila')
    .setLocale('en-PH')
    .toLocaleString({ dateStyle: 'medium', timeStyle: 'short' }),
})
