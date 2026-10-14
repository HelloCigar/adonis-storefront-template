import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Payment from '#models/payments/payment'
import Shipment from '#models/checkout/shipment'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'

export async function paidOrder() {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    totalMinor: 59900,
  }).create()
  const payment = await Payment.create({
    orderId: order.id,
    provider: 'order-operations',
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: 59900,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  await Shipment.create({ orderId: order.id, state: 'pending' })
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  return { order, payment, staff }
}
