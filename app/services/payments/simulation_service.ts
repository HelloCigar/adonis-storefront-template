import { inject } from '@adonisjs/core'
import FakePayMongoService from '#services/payments/fake_paymongo_service'
import SettlementService from '#services/payments/settlement_service'
import RecoveryService from '#services/payments/recovery_service'
import Attempt from '#models/payments/attempt'

@inject()
export default class SimulationService {
  constructor(
    private gateway: FakePayMongoService,
    private settlement: SettlementService,
    private recovery: RecoveryService
  ) {}

  async show(id: string) {
    const { input, session } = await this.gateway.inspectCheckout(id)
    return {
      id: session.id,
      reference: session.reference!,
      status: session.status,
      items: input.items.map(({ name, unitAmount, quantity }) => ({ name, unitAmount, quantity })),
      amountMinor: input.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
      failed: session.payments.at(-1)?.status === 'failed',
    }
  }

  async update(id: string, outcome: 'paid' | 'failed' | 'expired' | 'paid_without_notification') {
    const checkout = await this.gateway.changeCheckout(
      id,
      outcome === 'paid_without_notification' ? 'paid' : outcome
    )
    // Use the same normalized settlement boundary as verified webhooks. Never write order status here.
    if (checkout.status === 'paid' && outcome !== 'paid_without_notification')
      await this.settlement.apply(checkout)
    else if (checkout.status === 'expired') {
      const attempt = await Attempt.query()
        .where({ provider: checkout.provider, externalId: checkout.id })
        .first()
      if (attempt) await this.recovery.run(attempt.id)
    }
    return checkout
  }
}
