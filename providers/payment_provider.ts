import type { ApplicationService } from '@adonisjs/core/types'
import type { PaymentConfig } from '#config/payment'
import PaymentService from '#services/payments/payment_service'
import PayMongoService from '#services/payments/paymongo_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePayMongoService from '#services/payments/fake_paymongo_service'
import type { PaymentAdapter } from '#services/payments/payment_service'

export default class PaymentProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(PaymentService, async (resolver) => {
      const config = this.app.config.get<PaymentConfig>('payment')
      const adapters: PaymentAdapter[] = [new PayMongoService(config.paymongo)]
      if (this.app.inDev || this.app.inTest) adapters.push(await resolver.make(FakePayMongoService))
      return new DispatcherService(config.defaultProvider, adapters)
    })
  }

  async boot() {
    if (
      this.app.inProduction &&
      this.app.config.get<PaymentConfig>('payment').defaultProvider === 'fake_paymongo'
    )
      throw new Error('fake_paymongo is only available in development and tests')
  }
}
