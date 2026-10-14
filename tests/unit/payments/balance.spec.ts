import { test } from '@japa/runner'
import MoneyService from '#services/checkout/money_service'
import BalanceService from '#services/payments/balance_service'
import { observation, payment } from '#tests/helpers/payment_balance'

test.group('Payment balance', () => {
  const balances = new BalanceService(new MoneyService())

  test('counts only confirmed refunds in the payment currency', ({ assert }) => {
    const balance = balances.summarize(payment, [
      observation('succeeded', 10_000),
      observation('failed', 20_000),
      observation('pending', 5_000),
    ])
    assert.equal(balance.refundedMinor, 10_000)
    assert.equal(balance.remainingMinor, 49_900)
    assert.isTrue(balance.pending)
    assert.isTrue(balance.active)
    assert.isFalse(balance.currencyMismatch)
    assert.isFalse(balance.overRefunded)
    assert.lengthOf(balance.observations, 3)
  })

  test('flags currency mismatches but ignores failed foreign refunds', ({ assert }) => {
    assert.isTrue(
      balances.summarize(payment, [observation('succeeded', 100, 'USD')]).currencyMismatch
    )
    const failedOnly = balances.summarize(payment, [observation('failed', 100, 'USD')])
    assert.isFalse(failedOnly.currencyMismatch)
    assert.isFalse(failedOnly.active)
    assert.equal(failedOnly.refundedMinor, 0)
  })

  test('never reports a negative remainder when refunds exceed the capture', ({ assert }) => {
    const balance = balances.summarize(payment, [
      observation('succeeded', 59_900),
      observation('succeeded', 1_000),
    ])
    assert.isTrue(balance.overRefunded)
    assert.equal(balance.remainingMinor, 0)
  })
})
