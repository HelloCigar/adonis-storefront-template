import type { ApplicationService } from '@adonisjs/core/types'
import type { PaymentConfig } from '#config/payment'
import PaymentService from '#services/payments/payment_service'
import PayMongoService from '#services/payments/paymongo_service'
import DispatcherService from '#services/payments/dispatcher_service'

export default class PaymentProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(PaymentService, () => {
      const config = this.app.config.get<PaymentConfig>('payment')
      return new DispatcherService(config.defaultProvider, [new PayMongoService(config.paymongo)])
    })
  }
}
