import { createHmac } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import PaymentService from '#services/payments/payment_service'
import type { PayMongoConfig, PayMongoFetch } from '#providers/payments/paymongo_service'

export const config: PayMongoConfig = {
  secretKey: new Secret('sk_test_fixture'),
  webhookSecret: new Secret('whsec_fixture'),
  paymentMethods: ['card', 'gcash', 'qrph'],
  timeoutMs: 1000,
  webhookToleranceSeconds: 300,
}

export function payment(status: 'paid' | 'failed' = 'paid', liveMode = false) {
  return {
    id: status === 'paid' ? 'pay_paid' : 'pay_failed',
    type: 'payment',
    attributes: { amount: 109_800, currency: 'PHP', status, livemode: liveMode },
  }
}

export function checkout(
  status: 'active' | 'expired' = 'active',
  payments = [] as ReturnType<typeof payment>[],
  liveMode = false
) {
  return {
    id: 'cs_fixture',
    type: 'checkout_session',
    attributes: {
      checkout_url: 'https://checkout.paymongo.com/cs_fixture',
      reference_number: 'ORDER-42',
      status,
      livemode: liveMode,
      metadata: { order_id: '42' },
      payments,
      client_key: 'must-not-escape-adapter',
    },
  }
}

export function transport(payload: unknown, status = 200) {
  const calls: { url: string; options: RequestInit }[] = []
  const fetcher: PayMongoFetch = async (url, options) => {
    calls.push({ url: String(url), options: options! })
    return new Response(JSON.stringify(payload), { status })
  }
  return { calls, fetcher }
}

export function webhook(
  payload: unknown,
  options: { liveMode?: boolean; timestamp?: number } = {}
) {
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)
  const digest = createHmac('sha256', config.webhookSecret!.release())
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  return {
    rawBody,
    headers: {
      'Paymongo-Signature': `t=${timestamp},te=${options.liveMode ? '' : digest},li=${options.liveMode ? digest : ''}`,
    },
  }
}

export function paidEvent(liveMode = false) {
  return {
    data: {
      type: 'checkout_session.payment.paid',
      livemode: liveMode,
      data: checkout('active', [payment('paid', liveMode)], liveMode),
    },
  }
}

@inject()
export class PaymentConsumer {
  constructor(public payments: PaymentService) {}
}
