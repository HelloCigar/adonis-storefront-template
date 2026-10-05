import { createHmac } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { Secret } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import PaymentException from '#exceptions/payment_exception'
import PaymentService, { type CheckoutInput } from '#services/payments/payment_service'
import PayMongoService, {
  type PayMongoConfig,
  type PayMongoFetch,
} from '#providers/payments/paymongo_service'
import DispatcherService from '#services/payments/dispatcher_service'

const config: PayMongoConfig = {
  secretKey: new Secret('sk_test_fixture'),
  webhookSecret: new Secret('whsec_fixture'),
  paymentMethods: ['card', 'gcash', 'qrph'],
  timeoutMs: 1000,
  webhookToleranceSeconds: 300,
}

const checkoutInput: CheckoutInput = {
  reference: 'ORDER-42',
  currency: 'PHP',
  items: [
    {
      name: 'Shirt',
      unitAmount: 49_900,
      quantity: 2,
      description: 'Blue',
      imageUrl: 'https://store.example/shirt.jpg',
    },
    { name: 'Shipping', unitAmount: 10_000, quantity: 1 },
  ],
  successUrl: 'https://store.example/checkout/success',
  cancelUrl: 'https://store.example/cart',
  customer: { name: 'Test Customer', email: 'customer@example.com' },
  metadata: { order_id: '42' },
  idempotencyKey: 'order-42-attempt-1',
}

function payment(status: 'paid' | 'failed' = 'paid', liveMode = false) {
  return {
    id: status === 'paid' ? 'pay_paid' : 'pay_failed',
    type: 'payment',
    attributes: { amount: 109_800, currency: 'PHP', status, livemode: liveMode },
  }
}

function checkout(
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

function transport(payload: unknown, status = 200) {
  const calls: { url: string; options: RequestInit }[] = []
  const fetcher: PayMongoFetch = async (url, options) => {
    calls.push({ url: String(url), options: options! })
    return new Response(JSON.stringify(payload), { status })
  }
  return { calls, fetcher }
}

function webhook(payload: unknown, options: { liveMode?: boolean; timestamp?: number } = {}) {
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

function paidEvent(liveMode = false) {
  return {
    data: {
      type: 'checkout_session.payment.paid',
      livemode: liveMode,
      data: checkout('active', [payment('paid', liveMode)], liveMode),
    },
  }
}

test.group('PayMongo payment adapter', () => {
  test('creates a multi-item hosted checkout with minor units and a stable retry key', async ({
    assert,
  }) => {
    const http = transport({ data: checkout() })
    const service = new PayMongoService(config, http.fetcher)
    const result = await service.createCheckout(checkoutInput)

    assert.equal(http.calls.length, 1)
    const { url, options } = http.calls[0]
    assert.equal(url, 'https://api.paymongo.com/v2/checkout_sessions')
    assert.equal(options.method, 'POST')
    assert.equal(options.redirect, 'error')
    assert.instanceOf(options.signal, AbortSignal)
    const headers = new Headers(options.headers)
    assert.equal(
      headers.get('authorization'),
      `Basic ${Buffer.from('sk_test_fixture:').toString('base64')}`
    )
    assert.equal(headers.get('idempotency-key'), checkoutInput.idempotencyKey)
    assert.deepEqual(JSON.parse(options.body as string), {
      data: {
        attributes: {
          reference_number: 'ORDER-42',
          line_items: [
            {
              name: 'Shirt',
              amount: 49_900,
              currency: 'PHP',
              quantity: 2,
              description: 'Blue',
              images: ['https://store.example/shirt.jpg'],
            },
            { name: 'Shipping', amount: 10_000, currency: 'PHP', quantity: 1 },
          ],
          payment_method_types: ['card', 'gcash', 'qrph'],
          success_url: checkoutInput.successUrl,
          cancel_url: checkoutInput.cancelUrl,
          billing: checkoutInput.customer,
          metadata: checkoutInput.metadata,
        },
      },
    })
    assert.deepEqual(result, {
      provider: 'paymongo',
      id: 'cs_fixture',
      url: 'https://checkout.paymongo.com/cs_fixture',
      reference: 'ORDER-42',
      status: 'pending',
      liveMode: false,
      metadata: { order_id: '42' },
      payments: [],
    })
    assert.notInclude(JSON.stringify(result), 'client_key')
  })

  test('recognizes successful payment despite an active session and a failed earlier attempt', async ({
    assert,
  }) => {
    const http = transport({ data: checkout('active', [payment('failed'), payment()]) })
    const result = await new PayMongoService(config, http.fetcher).getCheckout('cs_fixture')
    assert.equal(result.status, 'paid')
    assert.equal(result.payments[1].amount, 109_800)
    assert.equal(http.calls[0].url, 'https://api.paymongo.com/v1/checkout_sessions/cs_fixture')
    assert.equal(http.calls[0].options.method, 'GET')
    assert.isNull(new Headers(http.calls[0].options.headers).get('idempotency-key'))
  })

  test('expires a checkout and preserves paid status when expiring an already paid session', async ({
    assert,
  }) => {
    for (const payments of [[], [payment()]]) {
      const http = transport({ data: checkout('expired', payments) })
      const result = await new PayMongoService(config, http.fetcher).expireCheckout(
        'cs_fixture',
        'expire-42'
      )
      assert.equal(result.status, payments.length ? 'paid' : 'expired')
      assert.equal(
        http.calls[0].url,
        'https://api.paymongo.com/v1/checkout_sessions/cs_fixture/expire'
      )
      assert.equal(http.calls[0].options.method, 'POST')
      assert.equal(new Headers(http.calls[0].options.headers).get('idempotency-key'), 'expire-42')
    }
  })

  test('maps partial refunds and processing status through the shared contract', async ({
    assert,
  }) => {
    const http = transport({
      data: {
        id: 'ref_fixture',
        type: 'refund',
        attributes: {
          amount: 5000,
          currency: 'PHP',
          payment_id: 'pay_paid',
          status: 'processing',
          livemode: false,
        },
      },
    })
    const result = await new PayMongoService(config, http.fetcher).refund({
      paymentId: 'pay_paid',
      amount: 5000,
      currency: 'PHP',
      reason: 'requested_by_customer',
      notes: 'Partial return',
      idempotencyKey: 'refund-42-1',
    })
    assert.equal(http.calls[0].url, 'https://api.paymongo.com/v1/refunds')
    assert.equal(new Headers(http.calls[0].options.headers).get('idempotency-key'), 'refund-42-1')
    assert.deepEqual(JSON.parse(http.calls[0].options.body as string), {
      data: {
        attributes: {
          payment_id: 'pay_paid',
          amount: 5000,
          reason: 'others',
          notes: 'Partial return',
        },
      },
    })
    assert.deepEqual(result, {
      provider: 'paymongo',
      id: 'ref_fixture',
      paymentId: 'pay_paid',
      amount: 5000,
      currency: 'PHP',
      status: 'pending',
      liveMode: false,
    })
  })

  test('rejects invalid amounts, currency, callbacks, metadata, and unsafe IDs before HTTP calls', async ({
    assert,
  }) => {
    const http = transport({ data: checkout() })
    const service = new PayMongoService(config, http.fetcher)
    const invalid: unknown[] = [
      { ...checkoutInput, currency: 'USD' },
      { ...checkoutInput, items: [] },
      { ...checkoutInput, items: [{ name: 'Test', unitAmount: 49.9, quantity: 1 }] },
      { ...checkoutInput, items: [{ name: 'Test', unitAmount: '49900', quantity: 1 }] },
      { ...checkoutInput, items: [{ name: 'Test', unitAmount: 100, quantity: 1.5 }] },
      { ...checkoutInput, items: [{ name: 'Test', unitAmount: Number.NaN, quantity: 1 }] },
      { ...checkoutInput, items: [{ name: 'Test', unitAmount: 100, quantity: 0 }] },
      {
        ...checkoutInput,
        items: [{ name: 'Test', unitAmount: Number.MAX_SAFE_INTEGER, quantity: 2 }],
      },
      { ...checkoutInput, successUrl: 'javascript:alert(1)' },
      { ...checkoutInput, metadata: { PYM_reserved: 'test' } },
      { ...checkoutInput, idempotencyKey: 'key\r\nBad: header' },
    ]
    for (const input of invalid) {
      await assert.rejects(
        () => service.createCheckout(input as CheckoutInput),
        /^Invalid (payment input|checkout total)$/
      )
    }
    await assert.rejects(
      () => service.getCheckout('cs_fixture/../../refunds'),
      'Invalid payment input'
    )
    await assert.rejects(() => service.expireCheckout('cs_fixture', ''), 'Invalid payment input')
    await assert.rejects(
      () =>
        service.refund({
          paymentId: 'pay_paid',
          amount: 0,
          currency: 'PHP',
          reason: 'duplicate',
          idempotencyKey: 'refund-42',
        }),
      'Invalid payment input'
    )
    assert.isEmpty(http.calls)
  })

  test('looks up refunds and normalizes confirmed updates without assuming pending means refunded', async ({
    assert,
  }) => {
    const refund = {
      id: 'ref_fixture',
      type: 'refund',
      attributes: {
        payment_id: 'pay_paid',
        amount: 5000,
        currency: 'PHP',
        status: 'succeeded',
        livemode: false,
      },
    }
    const http = transport({ data: refund })
    const service = new PayMongoService(config, http.fetcher)
    const result = await service.getRefund('ref_fixture')
    assert.equal(http.calls[0].url, 'https://api.paymongo.com/v1/refunds/ref_fixture')
    assert.equal(result.status, 'succeeded')
    const update = await service.parseWebhook(
      webhook({ data: { type: 'payment.refund.updated', livemode: false, data: refund } })
    )
    assert.equal(update.type, 'refund.updated')
    if (update.type === 'refund.updated') assert.deepEqual(update.refund, result)
    const sparse = await service.parseWebhook(
      webhook({
        data: {
          type: 'refund.succeeded',
          livemode: false,
          data: {
            id: 'ref_fixture',
            type: 'refund',
            attributes: { amount: 5000, status: 'succeeded' },
          },
        },
      })
    )
    assert.equal(sparse.type, 'refund.reconcile')
    const changed = await service.parseWebhook(
      webhook({
        data: {
          type: 'payment.refunded',
          livemode: false,
          data: { id: 'pay_paid', type: 'payment' },
        },
      })
    )
    assert.equal(changed.type, 'payment.refunds_changed')
    await assert.rejects(() => service.getRefund('ref_fixture/../other'), 'Invalid payment input')
    const wrongMode = transport({
      data: { ...refund, attributes: { ...refund.attributes, livemode: true } },
    })
    await assert.rejects(
      () => new PayMongoService(config, wrongMode.fetcher).getRefund('ref_fixture'),
      'Invalid payment provider payload'
    )
  })

  test('classifies timeouts and provider server errors as unknown outcomes for reconciliation', async ({
    assert,
  }) => {
    const fetchers: PayMongoFetch[] = [
      async () => {
        throw new Error('timeout')
      },
      transport({}, 500).fetcher,
      async () => new Response('invalid'),
    ]
    for (const fetcher of fetchers) {
      try {
        await new PayMongoService(config, fetcher).createCheckout(checkoutInput)
        assert.fail('Expected failure')
      } catch (error) {
        assert.instanceOf(error, PaymentException)
        assert.equal((error as PaymentException).outcome, 'unknown')
        assert.isTrue((error as PaymentException).retryable)
      }
    }
  })

  test('boots without credentials but fails payment calls safely when configuration is missing', async ({
    assert,
  }) => {
    const http = transport({ data: checkout() })
    for (const overrides of [
      { secretKey: undefined },
      { secretKey: new Secret('pk_test_public') },
      { timeoutMs: 0 },
      { paymentMethods: [] },
    ]) {
      const service = new PayMongoService({ ...config, ...overrides }, http.fetcher)
      await assert.rejects(
        () => service.createCheckout(checkoutInput),
        'PayMongo is not configured'
      )
    }
    assert.isEmpty(http.calls)
  })

  test('sanitizes upstream errors and never automatically retries a payment mutation', async ({
    assert,
  }) => {
    const http = transport({ errors: [{ detail: 'sk_test_leaked customer@example.com' }] }, 401)
    try {
      await new PayMongoService(config, http.fetcher).createCheckout(checkoutInput)
      assert.fail('Expected a payment exception')
    } catch (error) {
      assert.instanceOf(error, PaymentException)
      const exception = error as PaymentException
      assert.equal(exception.status, 502)
      assert.equal(exception.code, 'E_PAYMENT_PROVIDER')
      assert.equal(exception.providerStatus, 401)
      assert.equal(exception.outcome, 'rejected')
      assert.isFalse(exception.retryable)
      assert.notInclude(exception.message, 'sk_test')
      assert.notInclude(exception.message, 'customer@example.com')
    }
    assert.lengthOf(http.calls, 1)
    let attempts = 0
    const fetcher: PayMongoFetch = async () => {
      attempts++
      throw new Error('Authorization: sk_test_leaked')
    }
    await assert.rejects(
      () => new PayMongoService(config, fetcher).createCheckout(checkoutInput),
      'Payment provider request failed'
    )
    assert.equal(attempts, 1)
  })

  test('rejects malformed responses and responses from a different mode', async ({ assert }) => {
    const paidCheckout = checkout('active', [payment()])
    for (const payload of [
      { data: {} },
      { data: checkout('active', [], true) },
      { data: checkout('active', [payment('paid', true)]) },
      { data: { ...paidCheckout, attributes: { ...paidCheckout.attributes, livemode: 'false' } } },
      {
        data: {
          ...paidCheckout,
          attributes: {
            ...paidCheckout.attributes,
            payments: [{ ...payment(), attributes: { ...payment().attributes, amount: '109800' } }],
          },
        },
      },
    ]) {
      const http = transport(payload)
      await assert.rejects(
        () => new PayMongoService(config, http.fetcher).getCheckout('cs_fixture'),
        'Invalid payment provider payload'
      )
    }
    const fetcher: PayMongoFetch = async () => new Response('not json')
    await assert.rejects(
      () => new PayMongoService(config, fetcher).getCheckout('cs_fixture'),
      'Invalid payment provider payload'
    )
  })

  test('verifies raw webhook bodies in test and live mode and normalizes both envelope formats', async ({
    assert,
  }) => {
    const service = new PayMongoService(config)
    const modern = await service.parseWebhook(webhook(paidEvent()))
    assert.equal(modern.type, 'checkout.paid')
    assert.isNull(modern.id)
    if (modern.type === 'checkout.paid') {
      assert.equal(modern.checkout.reference, 'ORDER-42')
      assert.equal(modern.checkout.payments[0].id, 'pay_paid')
    }
    const legacy = webhook({
      data: { id: 'evt_fixture', type: 'event', attributes: paidEvent().data },
    })
    const event = await service.parseWebhook({ ...legacy, rawBody: Buffer.from(legacy.rawBody) })
    assert.equal(event.id, 'evt_fixture')
    assert.equal(event.type, 'checkout.paid')
    const liveService = new PayMongoService({ ...config, secretKey: new Secret('sk_live_fixture') })
    const liveEvent = await liveService.parseWebhook(webhook(paidEvent(true), { liveMode: true }))
    assert.isTrue(liveEvent.liveMode)
  })

  test('rejects tampering, wrong signature modes, expired signatures, and malformed signed payloads', async ({
    assert,
  }) => {
    const service = new PayMongoService(config)
    const valid = webhook(paidEvent())
    for (const input of [
      { ...valid, rawBody: `${valid.rawBody} ` },
      { ...valid, headers: {} },
      {
        ...valid,
        headers: {
          'paymongo-signature': [
            valid.headers['Paymongo-Signature'],
            valid.headers['Paymongo-Signature'],
          ],
        },
      },
      webhook(paidEvent(), { liveMode: true }),
      webhook(paidEvent(), { timestamp: Math.floor(Date.now() / 1000) - 301 }),
      webhook(paidEvent(), { timestamp: Math.floor(Date.now() / 1000) + 301 }),
      { ...valid, headers: { 'paymongo-signature': 't=1,te=not-hex' } },
    ]) {
      await assert.rejects(() => service.parseWebhook(input), 'Invalid payment webhook signature')
    }
    await assert.rejects(
      () => service.parseWebhook(webhook('not json')),
      'Invalid payment provider payload'
    )
    await assert.rejects(
      () => service.parseWebhook(webhook(paidEvent(true))),
      'Invalid payment provider payload'
    )
    await assert.rejects(
      () =>
        service.parseWebhook(
          webhook({
            data: { type: 'checkout_session.payment.paid', livemode: false, data: checkout() },
          })
        ),
      'Invalid payment provider payload'
    )
    await assert.rejects(
      () => new PayMongoService({ ...config, webhookSecret: undefined }).parseWebhook(valid),
      'PayMongo is not configured'
    )
  })

  test('returns ignored for authenticated events outside the checkout contract', async ({
    assert,
  }) => {
    const event = await new PayMongoService(config).parseWebhook(
      webhook({ data: { id: 'evt_other', type: 'source.chargeable', livemode: false, data: {} } })
    )
    assert.deepEqual(event, {
      id: 'evt_other',
      provider: 'paymongo',
      providerType: 'source.chargeable',
      type: 'ignored',
      liveMode: false,
    })
  })
})

@inject()
class PaymentConsumer {
  constructor(public payments: PaymentService) {}
}

test.group('Payment dependency injection', () => {
  test('resolves the abstract service as a singleton and supports container replacements', async ({
    assert,
    cleanup,
  }) => {
    const consumer = await app.container.make(PaymentConsumer)
    assert.instanceOf(consumer.payments, DispatcherService)
    assert.strictEqual(consumer.payments, await app.container.make(PaymentService))

    const replacement: PaymentService = {
      getProvider: () => ({
        provider: 'fake',
        liveMode: false,
        mutationReplayWindowMs: 0,
        idempotencyScope: 'test',
      }),
      createCheckout: async () => ({
        provider: 'fake',
        id: 'session-42',
        url: 'https://example.com/pay',
        reference: 'ORDER-42',
        status: 'pending',
        liveMode: false,
        metadata: {},
        payments: [],
      }),
      getCheckout: async () => {
        throw new Error('Unused fake method')
      },
      expireCheckout: async () => {
        throw new Error('Unused fake method')
      },
      refund: async () => {
        throw new Error('Unused fake method')
      },
      getRefund: async () => {
        throw new Error('Unused fake method')
      },
      parseWebhook: async () => {
        throw new Error('Unused fake method')
      },
    }
    cleanup(() => app.container.restore(PaymentService))
    app.container.swap(PaymentService, () => replacement)
    const replaced = await app.container.make(PaymentConsumer)
    assert.strictEqual(replaced.payments, replacement)
    const session = await replaced.payments.createCheckout(checkoutInput)
    assert.equal(session.provider, 'fake')
  })
})
