import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import checkoutConfig from '#config/checkout'
import Notification from '#models/checkout/notification'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import OrderNotification from '#mails/checkout/order_notification'
import { UserFactory } from '#database/factories/user_factory'
import { runQueue } from '#tests/helpers/queue'
import {
  awaitingPayment,
  paidOrder,
  resetCheckoutState,
  useFakeProvider,
} from '#tests/helpers/payments'
import { urlFor } from '@adonisjs/core/services/url_builder'

const tracking = {
  carrier: 'Sample Carrier',
  trackingNumber: 'TRACK-123',
  trackingUrl: 'https://carrier.example/track/123',
}

test.group('Order fulfillment', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('an unpaid order cannot be packed', async ({ client, assert }) => {
    useFakeProvider()
    const { order } = await awaitingPayment()
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    const shipment = await Shipment.findBy('orderId', order.id)
    assert.notEqual(shipment?.state, 'packing')
  })

  test('packing a paid order twice leaves one shipment being packed', async ({
    client,
    assert,
  }) => {
    const { order } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    for (let request = 0; request < 2; request++)
      await client
        .post(urlFor('seller.packing.store', { id: order.id }))
        .loginAs(staff)
        .withCsrfToken()
        .redirects(0)

    const shipments = await Shipment.query().where('order_id', order.id)
    assert.lengthOf(shipments, 1)
    assert.equal(shipments[0].state, 'packing')
  })

  test('shipping a packed order twice ships it once with its tracking details', async ({
    client,
    assert,
  }) => {
    const { order } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    for (let request = 0; request < 2; request++)
      await client
        .post(urlFor('seller.shipments.store', { id: order.id }))
        .loginAs(staff)
        .withCsrfToken()
        .form(tracking)
        .redirects(0)

    const shipments = await Shipment.query().where('order_id', order.id)
    assert.lengthOf(shipments, 1)
    assert.equal(shipments[0].state, 'shipped')
    assert.equal(shipments[0].trackingNumber, tracking.trackingNumber)
  })

  test('a shipped order cannot be cancelled', async ({ client, assert }) => {
    const { order, variant } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    await client
      .post(urlFor('seller.shipments.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .form(tracking)
      .redirects(0)

    await client
      .post(urlFor('seller.cancellations.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    await order.refresh()
    await variant.refresh()
    assert.notEqual(order.lifecycleState, 'cancelled')
    assert.equal(variant.inventoryQuantity, 0)
  })

  test('the receipt and shipping emails each go out once with a private order link', async ({
    client,
  }) => {
    using mails = mail.fake()
    const { order } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    await client
      .post(urlFor('seller.shipments.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .form(tracking)
      .redirects(0)

    await runQueue(['notifications'])

    mails.mails.assertSentCount(OrderNotification, 2)
    const link = `${new URL(checkoutConfig.publicUrl!).origin}/checkout/orders/${order.publicId}/access?token=`
    mails.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertHtmlIncludes(link)
      return message.hasTo('guest@example.com')
    })
  })

  test('the receipt email shows the order total', async ({ client }) => {
    using mails = mail.fake()
    await paidOrder(client, useFakeProvider())

    await runQueue(['notifications'])

    mails.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertHtmlIncludes('₱1,098.00')
      return true
    })
  })

  test('a staff retry of a delivered email does not send it again', async ({ client }) => {
    using mails = mail.fake()
    const { order } = await paidOrder(client, useFakeProvider())
    await runQueue(['notifications'])
    const receipt = await Notification.findByOrFail('orderId', order.id)
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    await client
      .post(urlFor('seller.operations.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .form({ kind: 'notification', operationId: receipt.id })
      .redirects(0)
    await runQueue(['notifications'])

    mails.mails.assertSentCount(OrderNotification, 1)
  })

  test('competing shipment and refund requests cannot both go through', async ({
    client,
    assert,
  }) => {
    const { order } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    await Promise.all([
      client
        .post(urlFor('seller.shipments.store', { id: order.id }))
        .loginAs(staff)
        .withCsrfToken()
        .form({ carrier: 'Carrier', trackingNumber: 'RACE-123' })
        .redirects(0),
      client
        .post(urlFor('seller.refunds.store', { id: order.id }))
        .loginAs(staff)
        .withCsrfToken()
        .redirects(0),
    ])

    const shipment = await Shipment.findByOrFail('orderId', order.id)
    const refunds = await RefundOperation.query().where('order_id', order.id)
    assert.isFalse(shipment.state === 'shipped' && refunds.length > 0)
  })

  test('customers are refused the staff {path} action')
    .with([
      { path: 'packing', name: 'seller.packing.store' },
      { path: 'shipment', name: 'seller.shipments.store' },
      { path: 'refund', name: 'seller.refunds.store' },
      { path: 'cancel', name: 'seller.cancellations.store' },
      { path: 'operations', name: 'seller.operations.store' },
    ] as const)
    .run(async ({ client }, { name }) => {
      const { order } = await paidOrder(client, useFakeProvider())
      const customer = await UserFactory.create()

      const response = await client
        .post(urlFor(name, { id: order.id }))
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')

      response.assertStatus(403)
    })

  test("staff cannot set an online order's payment or fulfillment status by hand", async ({
    client,
    assert,
  }) => {
    const { order } = await paidOrder(client, useFakeProvider())
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    const forged = await client
      .patch(urlFor('seller.orders.update', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .accept('json')
      .form({ financialStatus: 'refunded', fulfillmentStatus: 'fulfilled', note: null })

    forged.assertStatus(409)
    await order.refresh()
    assert.equal(order.financialStatus, 'paid')
  })
})
