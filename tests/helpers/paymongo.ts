import { createHmac } from 'node:crypto'
import type { ApiClient } from '@japa/api-client'
import { getActiveTestOrFail } from '@japa/runner'
import { Secret } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import PayMongoService from '#providers/payments/paymongo_service'

const webhookSecret = 'whsec_fixture'

/**
 * The store takes payments through the real PayMongo adapter for the active test. Its
 * network is cut off: `requests` counts every attempt to reach the PayMongo API.
 */
export function usePayMongo() {
  const network = { requests: 0 }
  const paymongo = new PayMongoService(
    {
      secretKey: new Secret('sk_test_fixture'),
      webhookSecret: new Secret(webhookSecret),
      paymentMethods: ['card'],
      timeoutMs: 1000,
      webhookToleranceSeconds: 300,
    },
    async () => {
      network.requests++
      throw new Error('The PayMongo API is unreachable in tests')
    }
  )
  app.container.swap(PaymentService, () => new DispatcherService('paymongo', [paymongo]))
  getActiveTestOrFail().cleanup(() => app.container.restore(PaymentService))
  return network
}

/** Posts a PayMongo webhook body with the given signature header, or a valid test-mode one. */
export function sendPayMongoWebhook(client: ApiClient, body: unknown, signature?: string) {
  const raw = JSON.stringify(body, null, 2)
  const time = Math.floor(Date.now() / 1000)
  const digest = createHmac('sha256', webhookSecret).update(`${time}.${raw}`).digest('hex')
  return client
    .post('/payments/webhooks/paymongo')
    .header('content-type', 'application/json')
    .header('Paymongo-Signature', signature ?? `t=${time},te=${digest},li=`)
    .unsafeJson(raw)
}

/** A test-mode `checkout_session.payment.paid` event for the attempt's order, fully paid. */
export function paidCheckoutEvent(
  order: { publicId: string | null },
  attempt: { publicId: string }
) {
  return {
    data: {
      id: 'evt_paid_fixture',
      type: 'checkout_session.payment.paid',
      livemode: false,
      data: {
        id: 'cs_fixture',
        type: 'checkout_session',
        attributes: {
          checkout_url: 'https://checkout.paymongo.com/cs_fixture',
          reference_number: order.publicId,
          status: 'active',
          livemode: false,
          metadata: { attemptId: attempt.publicId },
          payments: [
            {
              id: 'pay_fixture',
              type: 'payment',
              attributes: { amount: 109800, currency: 'PHP', status: 'paid', livemode: false },
            },
          ],
        },
      },
    },
  }
}
