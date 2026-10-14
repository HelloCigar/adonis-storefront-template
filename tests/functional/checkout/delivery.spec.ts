import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import Activity from '#models/checkout/activity'
import Notification from '#models/checkout/notification'
import Shipment from '#models/checkout/shipment'
import NotificationService from '#services/checkout/notification_service'
import RefundService from '#services/payments/refund_service'
import OrderNotification from '#mails/checkout/order_notification'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { tracking, paidOrder, shippedOrder } from '#tests/helpers/delivery'

test.group('Delivery confirmation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('only a shipped order can be marked delivered, and only by staff', async ({ assert }) => {
    const { order, staff, fulfillment } = await paidOrder()
    await assert.rejects(() => fulfillment.deliver(order.id, staff), /Only a shipped order/)
    await fulfillment.pack(order.id, staff)
    await assert.rejects(() => fulfillment.deliver(order.id, staff), /Only a shipped order/)
    await fulfillment.ship(order.id, staff, tracking)
    const customer = await UserFactory.create()
    await assert.rejects(() => fulfillment.deliver(order.id, customer), /Access denied/)
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'shipped')
    assert.isNull(shipment.deliveredAt)
  })

  test('delivery is recorded once and emails the customer once', async ({ assert }) => {
    using fakeMail = mail.fake()
    const { order, staff, fulfillment } = await shippedOrder()
    const first = await fulfillment.deliver(order.id, staff)
    const again = await fulfillment.deliver(order.id, staff)
    assert.equal(first.id, again.id)
    assert.equal(again.state, 'delivered')
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'delivered')
    // The replay returns the stored row without moving the recorded delivery time.
    assert.equal(again.deliveredAt?.toMillis(), shipment.deliveredAt?.toMillis())
    assert.equal(Math.floor(first.deliveredAt!.toSeconds()), shipment.deliveredAt!.toSeconds())
    assert.equal(shipment.trackingNumber, tracking.trackingNumber)
    const events = await Activity.query()
      .where('order_id', order.id)
      .where('event', 'shipment.delivered')
    assert.lengthOf(events, 1)
    assert.equal(events[0].actorId, staff.id)

    const delivery = await Notification.query()
      .where('order_id', order.id)
      .where('kind', 'delivery')
    assert.lengthOf(delivery, 1)
    const notifications = await app.container.make(NotificationService)
    await notifications.run(delivery[0].id)
    await notifications.run(delivery[0].id)
    fakeMail.mails.assertSentCount(1)
    fakeMail.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertSubject(`Your order was delivered · ${order.number}`)
      message.assertHtmlIncludes('Sample Carrier has delivered your parcel')
      message.assertHtmlIncludes('Delivered to')
      message.assertTextIncludes('Your order was delivered')
      return message.hasTo('guest@example.com')
    })
  })

  test('a delivered order keeps the shipped guards on cancellation, refunds, and tracking', async ({
    assert,
  }) => {
    const { order, staff, fulfillment } = await shippedOrder()
    await fulfillment.deliver(order.id, staff)
    await assert.rejects(() => fulfillment.cancel(order.id, staff), /shipped order cannot/)
    const refunds = await app.container.make(RefundService)
    await assert.rejects(() => refunds.requestFull(order.id, staff), /unshipped/)
    // Replaying the original shipment is still harmless; changing its tracking is not.
    const replay = await fulfillment.ship(order.id, staff, tracking)
    assert.equal(replay.state, 'delivered')
    await assert.rejects(
      () => fulfillment.ship(order.id, staff, { ...tracking, trackingNumber: 'OTHER-1' }),
      /different tracking/
    )
    await assert.rejects(() =>
      Shipment.query().where('order_id', order.id).update({ state: 'lost' })
    )
  })

  test('the staff detail page offers delivery only while the parcel is in transit', async ({
    client,
    assert,
    route,
  }) => {
    const { order, staff, fulfillment } = await paidOrder()
    const pending = await client
      .get(route('seller.orders.show', { id: order.id }))
      .loginAs(staff)
      .withInertia()
    assert.isFalse(pending.inertiaProps.operations.canDeliver)

    await fulfillment.pack(order.id, staff)
    await fulfillment.ship(order.id, staff, tracking)
    const shipped = await client
      .get(route('seller.orders.show', { id: order.id }))
      .loginAs(staff)
      .withInertia()
    assert.isTrue(shipped.inertiaProps.operations.canDeliver)
    assert.isFalse(shipped.inertiaProps.operations.canCancel)
    assert.isNull(shipped.inertiaProps.order.shipment.deliveredAt)

    const customer = await UserFactory.create()
    const denied = await client
      .post(urlFor('seller.deliveries.store', { id: order.id }))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
    denied.assertStatus(403)

    const recorded = await client
      .post(urlFor('seller.deliveries.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    recorded.assertStatus(302)
    recorded.assertHeader('location', route('seller.orders.show', { id: order.id }))
    recorded.assertFlashMessage('success', 'Delivery recorded')

    const delivered = await client
      .get(route('seller.orders.show', { id: order.id }))
      .loginAs(staff)
      .withInertia()
    assert.isFalse(delivered.inertiaProps.operations.canDeliver)
    assert.equal(delivered.inertiaProps.order.shipment.state, 'delivered')
    assert.isNotNull(delivered.inertiaProps.order.shipment.deliveredAt)
    assert.isTrue(
      delivered.inertiaProps.order.timeline.some(
        (entry: { type: string; title: string }) =>
          entry.type === 'event' && entry.title === 'Delivery recorded'
      )
    )
    assert.isFalse(
      delivered.inertiaProps.operations.payments.some(
        (payment: { canRefund: boolean }) => payment.canRefund
      )
    )
  })

  test('marking an undispatched order delivered is rejected without changing it', async ({
    client,
    assert,
  }) => {
    const { order, staff } = await paidOrder()
    const response = await client
      .post(urlFor('seller.deliveries.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .accept('json')
    response.assertStatus(409)
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'pending')
    assert.lengthOf(await Notification.query().where('kind', 'delivery'), 0)
  })
})
