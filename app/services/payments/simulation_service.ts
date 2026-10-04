import { inject } from '@adonisjs/core'
import PaymentService, { type PaymentReference } from '#services/payments/payment_service'
import RecoveryService from '#services/payments/recovery_service'
import Attempt from '#models/payments/attempt'

@inject()
export default class SimulationService {
  constructor(
    private payments: PaymentService,
    private recovery: RecoveryService
  ) {}

  async show(reference: PaymentReference) {
    const session = await this.payments.getCheckout(reference)
    const attempt = await this.attempt(reference, session.liveMode)
    const input = attempt.requestSnapshot
    return {
      id: session.id,
      reference: session.reference!,
      status: session.status,
      items: input.items.map(({ name, unitAmount, quantity }) => ({ name, unitAmount, quantity })),
      amountMinor: input.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
      failed: session.payments.at(-1)?.status === 'failed',
    }
  }

  async update(reference: PaymentReference) {
    const provider = this.payments.getProvider(reference.provider)
    const attempt = await this.attempt(reference, provider.liveMode)
    await this.recovery.run(attempt.id)
  }

  private attempt(reference: PaymentReference, liveMode: boolean) {
    return Attempt.query()
      .where({ provider: reference.provider, externalId: reference.id, liveMode })
      .firstOrFail()
  }
}
