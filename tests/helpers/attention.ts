import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import type Order from '#models/checkout/order'
import Shipment from '#models/checkout/shipment'
import Attempt from '#models/payments/attempt'
import Payment from '#models/payments/payment'
import RefundOperation from '#models/payments/refund_operation'
import type { ShipmentState } from '#services/checkout/state_service'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

/** Whole seconds, so values survive the SQLite round trip unchanged. */
export const ago = (values: { days?: number; hours?: number; minutes?: number }) =>
  DateTime.utc().minus(values).startOf('second')

export const millis = (iso: string | null) => (iso ? DateTime.fromISO(iso).toMillis() : null)

export const staffUser = () => UserFactory.merge({ role: 'staff' }).create()

/** Opens the dashboard as staff and returns the deferred `attention` prop. */
export async function attention(client: any, staff: User) {
  const page = await client.get(urlFor('dashboard')).loginAs(staff).withInertia()
  page.assertStatus(200)
  return page.inertiaProps.attention
}

/** An online order that has been paid and confirmed, with one shipment in the given state. */
export async function onlineOrder(
  values: Partial<Order> = {},
  shipment: { state: ShipmentState; packingAt?: DateTime | null } | null = { state: 'pending' }
) {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    paidAt: DateTime.utc(),
    ...values,
  }).create()
  if (shipment) await Shipment.create({ orderId: order.id, ...shipment })
  return order
}

/** A manually recorded order; the database defaults these to the legacy source. */
export const legacyOrder = (values: Partial<Order> = {}) =>
  OrderFactory.merge({ source: 'legacy', financialStatus: 'paid', ...values }).create()

export function openAttempt(order: Order, values: Partial<Attempt> = {}) {
  return Attempt.create({
    publicId: randomUUID(),
    orderId: order.id,
    provider: 'attention-test',
    liveMode: false,
    amountMinor: 1000,
    currency: 'PHP',
    state: 'pending',
    version: 0,
    idempotencyKey: randomUUID(),
    expiresAtMs: Date.now() + 60_000,
    replayScope: 'resource',
    needsReview: false,
    requestSnapshot: {
      reference: randomUUID(),
      currency: 'PHP',
      items: [{ name: 'Order', unitAmount: 1000, quantity: 1 }],
    } as any,
    ...values,
  })
}

export async function refund(order: Order, values: Partial<RefundOperation> = {}) {
  const payment = await Payment.create({
    orderId: order.id,
    provider: 'attention-test',
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: 1000,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  return RefundOperation.create({
    orderId: order.id,
    paymentId: payment.id,
    provider: payment.provider,
    liveMode: false,
    amountMinor: 1000,
    reason: 'requested_by_customer',
    idempotencyKey: randomUUID(),
    state: 'pending',
    needsReview: false,
    replayScope: 'resource',
    ...values,
  })
}

export function customerMessage(
  order: Order,
  body: string,
  createdAt: DateTime,
  readAt?: DateTime
) {
  return OrderMessage.create({
    publicId: randomUUID(),
    orderId: order.id,
    senderId: order.userId,
    senderRole: 'customer',
    senderName: 'Customer',
    body,
    createdAt,
    readAt: readAt ?? null,
  })
}
