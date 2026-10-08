import { test } from '@japa/runner'
import DiscountService from '#services/checkout/discount_service'

test.group('Discount amounts', () => {
  const discounts = new DiscountService()

  test('percentages round half up once on the subtotal', ({ assert }) => {
    const percent = (percentOff: number, subtotal: number) =>
      discounts.amountFor({ kind: 'percentage', percentOff, amountOffMinor: null }, subtotal)
    assert.equal(percent(10, 49_900), 4_990)
    assert.equal(percent(15, 999), 150)
    assert.equal(percent(15, 990), 149)
    assert.equal(percent(100, 12_345), 12_345)
    assert.equal(percent(50, Number.MAX_SAFE_INTEGER), 4_503_599_627_370_496)
  })

  test('fixed amounts never exceed the subtotal', ({ assert }) => {
    const fixed = (amountOffMinor: number, subtotal: number) =>
      discounts.amountFor({ kind: 'fixed', percentOff: null, amountOffMinor }, subtotal)
    assert.equal(fixed(10_000, 49_900), 10_000)
    assert.equal(fixed(100_000, 49_900), 49_900)
  })

  test('line shares are proportional, exact and stable', ({ assert }) => {
    assert.deepEqual(discounts.allocate(100, [100, 100, 100]), [34, 33, 33])
    assert.deepEqual(discounts.allocate(1, [100, 300]), [0, 1])
    assert.deepEqual(discounts.allocate(16_470, [149_700, 15_000]), [14_970, 1_500])
    assert.deepEqual(discounts.allocate(0, [500, 700]), [0, 0])
    const shares = discounts.allocate(9_999, [1, 2, 3, 4_000, 77])
    assert.equal(
      shares.reduce((sum, share) => sum + share, 0),
      9_999
    )
    shares.forEach((share, index) => assert.isAtMost(share, [1, 2, 3, 4_000, 77][index] * 3))
  })
})
