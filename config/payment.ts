import env from '#start/env'
import type { PayMongoConfig } from '#services/payments/paymongo_service'

export interface PaymentConfig {
  defaultProvider: string
  paymongo: PayMongoConfig
}

const paymentConfig: PaymentConfig = {
  defaultProvider: env.get('PAYMENT_PROVIDER', 'paymongo'),
  paymongo: {
    secretKey: env.get('PAYMONGO_SECRET_KEY'),
    webhookSecret: env.get('PAYMONGO_WEBHOOK_SECRET'),
    paymentMethods: env
      .get('PAYMONGO_PAYMENT_METHODS', 'card,gcash,qrph')
      .split(',')
      .map((method) => method.trim()),
    timeoutMs: env.get('PAYMONGO_TIMEOUT_MS', 15_000),
    webhookToleranceSeconds: env.get('PAYMONGO_WEBHOOK_TOLERANCE_SECONDS', 300),
  },
}

export default paymentConfig
