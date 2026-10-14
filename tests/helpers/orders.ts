import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import SettlementService from '#services/payments/settlement_service'
import FulfillmentService from '#services/checkout/fulfillment_service'
import Notification from '#models/checkout/notification'
import Payment from '#models/payments/payment'
import type Order from '#models/checkout/order'
import type FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { UserFactory } from '#database/factories/user_factory'

/**
 * A paid online order and a staff member to work it. `stage` advances fulfillment;
 * `extraPayment` adds a second captured payment (a duplicate flagged for review) so two
 * payments can be refunded.
 */
export async function setupConfirmedOrder(options: {
  adapter: FakePaymentAdapter
  stage?: 'packed' | 'shipped'
  extraPayment?: boolean
}) {
  const { order, attempt } = await simulatedCheckout()
  const checkout = options.adapter.sessions.get(attempt.externalId!)!
  checkout.status = 'paid'
  checkout.payments = [
    { id: `capture-${order.id}`, amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
  ]
  const settlement = await app.container.make(SettlementService)
  await settlement.apply(checkout)
  await order.refresh()
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  if (options.stage) {
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.pack(order.id, staff)
    if (options.stage === 'shipped')
      await fulfillment.ship(order.id, staff, {
        carrier: 'Sample Carrier',
        trackingNumber: 'SAMPLE-TRACKING',
      })
  }
  const extraPayment = options.extraPayment
    ? await Payment.create({
        orderId: order.id,
        provider: options.adapter.provider,
        liveMode: false,
        externalId: `extra-capture-${order.id}`,
        amountMinor: 10_000,
        currency: 'PHP',
        // An order holds one accepted payment; a duplicate capture is flagged for review.
        disposition: 'review_required',
        capturedAt: DateTime.utc(),
      })
    : null
  return { order, staff, extraPayment }
}

/** The order's customer email of `kind`, in the given delivery state and at the given times. */
export async function setupOrderEmail(
  order: Order,
  options: {
    kind: 'receipt' | 'shipment' | 'delivery'
    state: 'pending' | 'sent' | 'failed'
    createdAt?: DateTime
    sentAt?: DateTime
  }
) {
  const notification = await Notification.firstOrCreate(
    { orderId: order.id, kind: options.kind },
    { state: options.state }
  )
  notification.state = options.state
  notification.lastError = options.state === 'failed' ? 'E_MAIL_DELIVERY' : null
  notification.sentAt =
    options.state === 'sent' ? (options.sentAt ?? DateTime.utc()) : (options.sentAt ?? null)
  // createdAt is only filled automatically on insert, so a chosen time is saved as an update.
  if (options.createdAt) notification.createdAt = options.createdAt
  await notification.save()
  return notification
}
