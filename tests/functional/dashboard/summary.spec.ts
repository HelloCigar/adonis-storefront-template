import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'

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

  test('lines up the previous period with the chart buckets', async ({ client, assert, route }) => {
    const staff = await User.create({ email: 'staff@example.com', role: 'staff', password: 'x' })
    const storeDay = (day: string) => DateTime.fromISO(`${day}T12:00`, { zone: 'Asia/Manila' })
    await OrderFactory.merge({
      financialStatus: 'paid',
      totalMinor: 40000,
      processedAt: storeDay('2026-01-12'),
    }).create()
    await OrderFactory.merge({
      financialStatus: 'paid',
      totalMinor: 25000,
      processedAt: storeDay('2026-01-03'),
    }).create()
    await OrderFactory.merge({
      financialStatus: 'voided',
      totalMinor: 90000,
      processedAt: storeDay('2026-01-05'),
    }).create()

    const page = await client
      .get(route('dashboard'))
      .qs({ start: '2026-01-08', end: '2026-01-14', period: 'daily' })
      .loginAs(staff)
      .withInertia()
    const { summary } = page.inertiaProps

    assert.lengthOf(summary.chart, 7)
    assert.deepEqual(
      summary.chart
        .filter((bucket: { previous: number }) => bucket.previous)
        .map((bucket: { date: string; previous: number }) => [bucket.date, bucket.previous]),
      [['2026-01-10', 250]]
    )
    assert.equal(
      summary.chart.reduce((total: number, bucket: { amount: number }) => total + bucket.amount, 0),
      summary.stats.grossSales.value
    )
    assert.equal(summary.stats.grossSales.value, 400)
  })

  test('counts orders and new customers in each chart bucket', async ({
    client,
    assert,
    route,
  }) => {
    const storeDay = (day: string) => DateTime.fromISO(`${day}T12:00`, { zone: 'Asia/Manila' })
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    for (const [day, financialStatus] of [
      ['2026-01-09', 'paid'],
      ['2026-01-09', 'paid'],
      ['2026-01-12', 'paid'],
      ['2026-01-12', 'voided'],
    ] as const) {
      await OrderFactory.merge({ financialStatus, processedAt: storeDay(day) }).create()
    }
    for (const [day, role] of [
      ['2026-01-09', 'customer'],
      ['2026-01-13', 'customer'],
      ['2026-01-11', 'staff'],
    ] as const) {
      await UserFactory.merge({ role, createdAt: storeDay(day) }).create()
    }

    const page = await client
      .get(route('dashboard'))
      .qs({ start: '2026-01-08', end: '2026-01-14', period: 'daily' })
      .loginAs(staff)
      .withInertia()
    const { summary } = page.inertiaProps
    const counts = (key: 'orders' | 'customers') =>
      Object.fromEntries(
        summary.chart
          .filter((bucket: Record<string, number>) => bucket[key])
          .map((bucket: Record<string, number | string>) => [bucket.date, bucket[key]])
      )

    assert.deepEqual(counts('orders'), { '2026-01-09': 2, '2026-01-12': 1 })
    assert.deepEqual(counts('customers'), { '2026-01-09': 1, '2026-01-13': 1 })
    assert.equal(summary.stats.paidOrders.value, 3)
    assert.equal(summary.stats.newCustomers.value, 2)
  })
})
