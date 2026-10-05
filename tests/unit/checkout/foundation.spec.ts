import { test } from '@japa/runner'
import MoneyService from '#services/checkout/money_service'
import StateService from '#services/checkout/state_service'
import checkoutConfig from '#config/checkout'

test.group('Checkout money and transitions', () => {
  test('quotes two PHP 499 items with one PHP 100 shipping charge using exact centavos', ({
    assert,
  }) => {
    const money = new MoneyService()
    const total = money.add(
      money.multiply(money.toMinor('499.00'), 2),
      checkoutConfig.flatShippingAmountMinor
    )
    assert.equal(total, 109_800)
    assert.equal(money.toMajor(total), '1098.00')
    assert.equal(money.toMinor('0.01'), 1)
    assert.equal(money.toMinor(499.9), 49_990)
    assert.equal(money.toMinor('90071992547409.91'), Number.MAX_SAFE_INTEGER)
    assert.equal(money.toMajor(Number.MAX_SAFE_INTEGER), '90071992547409.91')
  })

  test('rejects unsupported decimal precision, nonfinite amounts, overflow and invalid quantities', ({
    assert,
  }) => {
    const money = new MoneyService()
    for (const value of [
      '499.001',
      '1e3',
      '-1',
      '',
      '90071992547409.92',
      Number.NaN,
      Infinity,
      0.1 + 0.2,
    ]) {
      assert.throws(() => money.toMinor(value), 'Invalid money amount or precision')
    }
    assert.throws(() => money.add(Number.MAX_SAFE_INTEGER, 1))
    assert.throws(() => money.multiply(Number.MAX_SAFE_INTEGER, 2))
    assert.throws(() => money.multiply(100, 0))
    assert.throws(() => money.multiply(100, 1.5))
    assert.throws(() => money.toMajor(-1))
  })

  test('permits reconciliation and late paid observations while preventing terminal state reversal', ({
    assert,
  }) => {
    const states = new StateService()
    assert.equal(states.transition('attempt', 'unknown', 'paid'), 'paid')
    assert.equal(states.transition('attempt', 'closing', 'paid'), 'paid')
    assert.equal(states.transition('attempt', 'expired', 'paid'), 'paid')
    assert.equal(states.transition('reservation', 'reserved', 'consumed'), 'consumed')
    assert.equal(states.transition('reservation', 'consumed', 'consumed'), 'consumed')
    assert.throws(() => states.transition('attempt', 'paid', 'expired'))
    assert.throws(() => states.transition('reservation', 'consumed', 'released'))
    assert.throws(() => states.transition('reservation', 'released', 'consumed'))
    assert.throws(() => states.transition('cart', 'submitted', 'active'))
    assert.throws(() => states.transition('shipment', 'shipped', 'cancelled'))
    assert.throws(() => states.transition('refund', 'succeeded', 'failed'))
  })

  test('derives financial status only from captured and confirmed refunded amounts', ({
    assert,
  }) => {
    const states = new StateService()
    assert.equal(states.financial(0, 0), 'pending')
    assert.equal(states.financial(0, 0, true), 'voided')
    assert.equal(states.financial(109_800, 0), 'paid')
    assert.equal(states.financial(109_800, 5000), 'partially_refunded')
    assert.equal(states.financial(109_800, 109_800), 'refunded')
    assert.throws(() => states.financial(100, 101))
    assert.throws(() => states.financial(-1, 0))
  })
})
