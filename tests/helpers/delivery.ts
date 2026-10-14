import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import Shipment from '#models/checkout/shipment'
import Payment from '#models/payments/payment'
import FulfillmentService from '#services/checkout/fulfillment_service'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'

export const tracking = {
  carrier: 'Sample Carrier',
  trackingNumber: 'TRACK-123',
  trackingUrl: 'https://carrier.example/track/123',
}

export async function paidOrder() {
  const order = await OrderFactory.merge({
    publicId: randomUUID(),
    email: 'guest@example.com',
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    totalMinor: 59900,
  })
    .with('lineItems', 1)
    .with('addresses', 1)
    .create()
  await Payment.create({
    orderId: order.id,
    provider: 'delivery',
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: 59900,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  await Shipment.create({ orderId: order.id, state: 'pending' })
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  const fulfillment = await app.container.make(FulfillmentService)
  return { order, staff, fulfillment }
}

export async function shippedOrder() {
  const fixture = await paidOrder()
  await fixture.fulfillment.pack(fixture.order.id, fixture.staff)
  await fixture.fulfillment.ship(fixture.order.id, fixture.staff, tracking)
  return fixture
}
