import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import database from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import InventoryService from '#services/catalog/inventory_service'
import OrderNotification from '#mails/checkout/order_notification'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { runQueue } from '#tests/helpers/queue'
import { savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Order emails carry the saved store details', (group) => {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      // Checkouts hold stock; release it before the tables are emptied.
      const inventory = await app.container.make(InventoryService)
      const held = await database.from('stock_reservations').where('state', 'reserved')
      for (const id of new Set(held.map((row) => row.order_id)))
        await database.transaction((trx) => inventory.release(trx, id))
      await truncate()
    }
  })

  test('the payment receipt email is sent under the saved store name', async ({
    visit,
    browserContext,
    route,
  }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })
    const { order, grant } = await simulatedCheckout()
    await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })

    const page = await visit(route('checkout.orders.show', { publicId: order.publicId! }))
    await page.getByRole('link', { name: 'Pay now', exact: true }).click()
    await page.getByRole('button', { name: 'Simulate successful payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    await runQueue(['payments', 'notifications', 'maintenance'])

    fake.mails.assertSent(OrderNotification, ({ message }) =>
      message.hasFrom('store@example.com', 'Lantern Goods')
    )
  })

  test('replies to the payment receipt go to the contact email', async ({
    visit,
    browserContext,
    route,
  }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })
    const { order, grant } = await simulatedCheckout()
    await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })

    const page = await visit(route('checkout.orders.show', { publicId: order.publicId! }))
    await page.getByRole('link', { name: 'Pay now', exact: true }).click()
    await page.getByRole('button', { name: 'Simulate successful payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    await runQueue(['payments', 'notifications', 'maintenance'])

    fake.mails.assertSent(OrderNotification, ({ message }) =>
      message.hasReplyTo('hello@lantern.test')
    )
  })

  test('the payment receipt email body names the saved store', async ({
    visit,
    browserContext,
    route,
  }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })
    const { order, grant } = await simulatedCheckout()
    await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })

    const page = await visit(route('checkout.orders.show', { publicId: order.publicId! }))
    await page.getByRole('link', { name: 'Pay now', exact: true }).click()
    await page.getByRole('button', { name: 'Simulate successful payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    await runQueue(['payments', 'notifications', 'maintenance'])

    fake.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertHtmlIncludes('Lantern Goods')
      return true
    })
  })
})
