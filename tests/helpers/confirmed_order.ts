import app from '@adonisjs/core/services/app'
import SettlementService from '#services/payments/settlement_service'
import type FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { UserFactory } from '#database/factories/user_factory'

/** A checkout the provider marked paid and the store settled, with a staff member to act on it. */
export async function confirmedOrder(adapter: FakePaymentAdapter) {
  const { order, attempt } = await simulatedCheckout()
  const checkout = adapter.sessions.get(attempt.externalId!)!
  checkout.status = 'paid'
  checkout.payments = [
    { id: `capture-${order.id}`, amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
  ]
  const settlement = await app.container.make(SettlementService)
  await settlement.apply(checkout)
  await order.refresh()
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  return { order, staff }
}
