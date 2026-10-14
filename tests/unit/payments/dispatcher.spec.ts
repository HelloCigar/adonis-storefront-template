import { test } from '@japa/runner'
import DispatcherService from '#services/payments/dispatcher_service'
import type { CheckoutInput } from '#services/payments/payment_service'
import { adapter } from '#tests/helpers/recording_payment_adapter'

test.group('Unified payment dispatcher', () => {
  test('changing the default keeps old checkout, expiry, refund and webhook references with their provider', async ({
    assert,
  }) => {
    const original = adapter('original')
    const next = adapter('next')
    const payments = new DispatcherService('next', [original.service, next.service])
    const reference = { provider: 'original', id: 'session:no-vendor-prefix' }
    assert.deepEqual(payments.getProvider(), {
      provider: 'next',
      liveMode: false,
      mutationReplayWindowMs: 0,
      idempotencyScope: 'next',
    })
    await payments.createCheckout({ reference: 'new-order' } as CheckoutInput)
    await payments.createCheckout({ reference: 'replay-old-order' } as CheckoutInput, 'original')
    await payments.getCheckout(reference)
    await payments.expireCheckout(reference, 'close-key')
    await payments.refund({
      payment: { provider: 'original', id: 'opaque-payment' },
      amount: 100,
      currency: 'PHP',
      reason: 'duplicate',
      idempotencyKey: 'refund-key',
    })
    await payments.getRefund({ provider: 'original', id: 'opaque-refund' })
    await payments.parseWebhook({ provider: 'original', rawBody: '{}', headers: {} })
    assert.deepEqual(next.calls, ['create:new-order'])
    assert.deepEqual(original.calls, [
      'create:replay-old-order',
      'get:session:no-vendor-prefix',
      'expire:session:no-vendor-prefix:close-key',
      'refund:opaque-payment:refund-key',
      'getRefund:opaque-refund',
      'webhook',
    ])
  })

  test('rejects unregistered providers instead of falling back to the current default', async ({
    assert,
  }) => {
    const fixture = adapter('current')
    const payments = new DispatcherService('current', [fixture.service])
    assert.throws(() => payments.getProvider('missing'), 'Payment provider is unavailable')
    await assert.rejects(
      async () => payments.getCheckout({ provider: 'missing', id: 'old' }),
      'Payment provider is unavailable'
    )
    await assert.rejects(
      async () => payments.parseWebhook({ provider: '__proto__', rawBody: '{}', headers: {} }),
      'Payment provider is unavailable'
    )
    assert.isEmpty(fixture.calls)
    assert.throws(
      () => new DispatcherService('current', [fixture.service, fixture.service]),
      'Duplicate payment adapter'
    )
  })
})
