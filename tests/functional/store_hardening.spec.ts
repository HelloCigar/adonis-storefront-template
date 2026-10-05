import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import { OrderFactory } from '#database/factories/order_factory'

const signup = (email: string) => ({
  fullName: 'Customer',
  email,
  password: 'secret-password',
  passwordConfirmation: 'secret-password',
})

test.group('Account emails', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('emails are stored lowercase and match regardless of case', async ({ client, assert }) => {
    const created = await client
      .post('/signup')
      .withCsrfToken()
      .redirects(0)
      .json(signup('  Mixed.Case@Example.COM '))
    created.assertStatus(302)
    const user = await User.findByOrFail('email', 'mixed.case@example.com')

    const duplicate = await client
      .post('/signup')
      .withCsrfToken()
      .accept('json')
      .json(signup('MIXED.case@example.com'))
    duplicate.assertStatus(422)
    assert.lengthOf(await User.query().whereILike('email', 'mixed.case@example.com'), 1)

    const login = await client
      .post('/login')
      .withCsrfToken()
      .redirects(0)
      .json({ email: 'MIXED.CASE@example.com', password: 'secret-password' })
    login.assertStatus(302)
    login.assertHeader('location', '/account')

    await user.merge({ email: 'Renamed@Example.com' }).save()
    const renamed = await User.findOrFail(user.id)
    assert.equal(renamed.email, 'renamed@example.com')
  })
})

test.group('Rate limits', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('repeated failed sign-ins lock that email even with the right password', async ({
    client,
    assert,
  }) => {
    await User.create({ email: 'locked@example.com', password: 'secret-password' })
    for (let attempt = 0; attempt < 5; attempt++) {
      const failed = await client
        .post('/login')
        .withCsrfToken()
        .accept('json')
        .json({ email: 'locked@example.com', password: 'wrong-password' })
      failed.assertStatus(400)
    }
    const locked = await client
      .post('/login')
      .withCsrfToken()
      .accept('json')
      .json({ email: 'Locked@example.com', password: 'secret-password' })
    locked.assertStatus(422)
    assert.match(locked.body().errors[0].message, /Too many failed sign-in attempts/)

    const otherEmail = await User.create({
      email: 'other@example.com',
      password: 'secret-password',
    })
    const unaffected = await client
      .post('/login')
      .withCsrfToken()
      .redirects(0)
      .json({ email: otherEmail.email, password: 'secret-password' })
    unaffected.assertStatus(302)
  })

  test('signup volume per client is capped and Inertia forms get a flash message', async ({
    client,
    assert,
  }) => {
    for (let index = 0; index < 5; index++) {
      const created = await client
        .post('/signup')
        .withCsrfToken()
        .redirects(0)
        .json(signup(`customer-${index}@example.com`))
      created.assertStatus(302)
    }
    const blocked = await client
      .post('/signup')
      .withCsrfToken()
      .accept('json')
      .json(signup('blocked@example.com'))
    blocked.assertStatus(429)
    assert.isNull(await User.findBy('email', 'blocked@example.com'))

    const inertia = await client
      .post('/signup')
      .withCsrfToken()
      .header('X-Inertia', 'true')
      .header('Referer', '/signup')
      .redirects(0)
      .json(signup('blocked@example.com'))
    assert.include([302, 303], inertia.status())
    assert.match(String(inertia.flashMessages().error), /Too many attempts/)
  })
})

test.group('Management dashboard', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('reports real captured sales for the selected range', async ({ client, assert }) => {
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

    const page = await client.get('/dashboard').loginAs(staff).withInertia()
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
      .get('/dashboard')
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
