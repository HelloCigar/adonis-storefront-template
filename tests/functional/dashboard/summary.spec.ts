import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import { OrderFactory } from '#database/factories/order_factory'

test.group('Management dashboard', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('reports real captured sales for the selected range', async ({ client, assert, route }) => {
    const staff = await User.create({ email: 'staff@example.com', role: 'staff', password: 'x' })
    await User.create({ email: 'buyer@example.com', role: 'customer', password: 'x' })
    const now = DateTime.utc()
    await OrderFactory.merge({
      financialStatus: 'paid',
      totalMinor: 100000,
      processedAt: now,
    }).create()
    await OrderFactory.merge({
      financialStatus: 'refunded',
      totalMinor: 50000,
      processedAt: now,
    }).create()
    await OrderFactory.merge({
      financialStatus: 'voided',
      totalMinor: 70000,
      processedAt: now,
    }).create()
    await OrderFactory.merge({
      financialStatus: 'paid',
      totalMinor: 30000,
      processedAt: now.minus({ days: 30 }),
    }).create()

    const page = await client.get(route('dashboard')).loginAs(staff).withInertia()
    page.assertStatus(200)
    const { summary } = page.inertiaProps
    assert.equal(summary.currency, 'PHP')
    assert.equal(summary.stats.grossSales.value, 1500)
    assert.equal(summary.stats.paidOrders.value, 2)
    assert.equal(summary.stats.averageOrder.value, 750)
    assert.equal(summary.stats.newCustomers.value, 1)
    assert.isNull(summary.stats.grossSales.change)
    assert.lengthOf(summary.recentOrders, 3)
    assert.equal(
      summary.chart.reduce((total: number, bucket: { amount: number }) => total + bucket.amount, 0),
      1500
    )

    const week = await client
      .get(route('dashboard'))
      .qs({ start: '2026-01-01', end: '2026-01-07', period: 'monthly' })
      .loginAs(staff)
      .withInertia()
    assert.deepEqual(week.inertiaProps.summary.query, {
      start: '2026-01-01',
      end: '2026-01-07',
      period: 'daily',
      periods: ['daily'],
    })
    assert.lengthOf(week.inertiaProps.summary.chart, 7)
    assert.equal(week.inertiaProps.summary.stats.grossSales.value, 0)
  })
})
