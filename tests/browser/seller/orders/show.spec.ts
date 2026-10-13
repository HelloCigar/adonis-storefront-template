import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { resetCheckoutState } from '#tests/helpers/payments'
import { setupConfirmedOrder, setupOrderEmail } from '#tests/helpers/orders'
import { UserFactory } from '#database/factories/user_factory'
import { OrderFactory } from '#database/factories/order_factory'

test.group('Staff order page', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const reset = await resetCheckoutState()
    adapter = new FakePaymentAdapter('order-page')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      await reset()
    }
  })

  test('the next action leads the page at {width}px')
    .with([{ width: 1280 }, { width: 390 }])
    .run(async ({ visit, browserContext, route, assert }, { width }) => {
      const { order, staff } = await setupConfirmedOrder({ adapter })
      await browserContext.loginAs(staff)
      const page = await visit(route('seller.orders.show', { id: order.id }))
      await page.setViewportSize({ width, height: 900 })
      const action = page.getByRole('heading', { name: 'Pack items', exact: true })
      await page.assertVisible(action)
      const actionTop = (await action.boundingBox())!.y
      const contents = page.getByRole('heading', { name: 'Order contents', exact: true })
      assert.isBelow(actionTop, (await contents.boundingBox())!.y)
      if (width === 390) {
        const customer = page.getByRole('heading', { name: 'Customer', exact: true })
        assert.isBelow(actionTop, (await customer.boundingBox())!.y)
      }
    })

  test('the add-tracking step shows the parcel contents without expanding anything', async ({
    visit,
    browserContext,
    route,
    assert,
  }) => {
    const { order, staff } = await setupConfirmedOrder({ adapter, stage: 'packed' })
    const item = await order.related('lineItems').query().firstOrFail()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.assertVisible(page.getByRole('heading', { name: 'Add tracking', exact: true }))
    const step = page.getByRole('region', { name: 'Add tracking' })
    await page.assertVisible(step.getByLabel('Carrier', { exact: true }))
    await page.assertVisible(step.getByText(item.title, { exact: true }))
    assert.equal(await page.getByText('Parcel contents', { exact: true }).count(), 0)
  })

  test('a {state} customer email {flagged ? "is" : "is not"} flagged near the top')
    .with([
      { state: 'failed' as const, flagged: true },
      { state: 'sent' as const, flagged: false },
    ])
    .run(async ({ visit, browserContext, route, assert }, { state, flagged }) => {
      const { order, staff } = await setupConfirmedOrder({ adapter })
      await setupOrderEmail(order, { kind: 'shipment', state })
      await browserContext.loginAs(staff)
      const page = await visit(route('seller.orders.show', { id: order.id }))
      const contents = page.getByRole('heading', { name: 'Order contents', exact: true })
      await page.assertVisible(contents)
      const notice = page.getByText('Shipment email failed', { exact: true })
      if (!flagged) {
        assert.equal(await notice.count(), 0)
        return
      }
      await page.assertVisible(notice)
      assert.isBelow((await notice.boundingBox())!.y, (await contents.boundingBox())!.y)
      const alert = page.getByRole('alert').filter({ has: notice })
      await page.assertVisible(
        alert.getByRole('button', { name: 'Retry shipment email', exact: true })
      )
    })

  test('the timeline lists events and customer emails together, newest first', async ({
    visit,
    browserContext,
    route,
    assert,
  }) => {
    const { order, staff } = await setupConfirmedOrder({ adapter, stage: 'shipped' })
    const sentAt = DateTime.utc().plus({ minutes: 5 })
    await setupOrderEmail(order, {
      kind: 'shipment',
      state: 'sent',
      createdAt: DateTime.utc().minus({ days: 1 }),
      sentAt,
    })
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    const timeline = page.getByRole('region', { name: 'Order activity' })
    const entries = timeline.getByRole('listitem')
    await page.assertVisible(entries.first())
    const titles = await entries.locator('[data-timeline-title]').allInnerTexts()
    assert.deepEqual(titles.slice(0, 3), ['Shipment email', 'Shipment recorded', 'Packing started'])
    const email = entries.nth(0)
    await page.assertVisible(email.getByText('Sent', { exact: true }))
    const formatted = new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(sentAt.toJSDate())
    await page.assertVisible(email.getByText(formatted, { exact: false }))
    await page.assertVisible(entries.nth(1).getByText(staff.fullName!, { exact: false }))
  })

  test('a failed email in the timeline is marked failed and offers retry', async ({
    visit,
    browserContext,
    route,
  }) => {
    const { order, staff } = await setupConfirmedOrder({ adapter })
    await setupOrderEmail(order, { kind: 'shipment', state: 'failed' })
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    const entry = page
      .getByRole('region', { name: 'Order activity' })
      .getByRole('listitem')
      .filter({ has: page.locator('[data-timeline-title]', { hasText: /^Shipment email$/ }) })
    await page.assertVisible(entry.getByText('Failed', { exact: true }))
    await page.assertVisible(
      entry.getByRole('button', { name: 'Retry shipment email', exact: true })
    )
  })

  test('a manual order records payment and fulfillment in the next-action slot with one note editor', async ({
    visit,
    browserContext,
    route,
    assert,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const order = await OrderFactory.create()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    const record = page.getByRole('heading', {
      name: 'Record payment and fulfillment',
      exact: true,
    })
    await page.assertVisible(record)
    const contents = page.getByRole('heading', { name: 'Order contents', exact: true })
    assert.isBelow((await record.boundingBox())!.y, (await contents.boundingBox())!.y)
    assert.equal(await page.getByLabel('Note', { exact: true }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Add note', exact: true }).count(), 0)
  })

  test('a manual order offers no More actions menu', async ({
    visit,
    browserContext,
    route,
    assert,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const order = await OrderFactory.create()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.assertVisible(
      page.getByRole('button', { name: 'Refresh status', exact: true }).first()
    )
    assert.equal(await page.getByRole('button', { name: 'More actions', exact: true }).count(), 0)
  })
})
