import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import database from '@adonisjs/lucid/services/db'
import InventoryService from '#services/catalog/inventory_service'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { runQueue } from '#tests/helpers/queue'
import { savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Invoices carry the saved store details', (group) => {
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

  test('the invoice names the saved store', async ({ visit, browserContext, assert }) => {
    // @ts-ignore -- the fake keeps the receipt mail away from a real mailbox
    using mails = mail.fake()

    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })
    const { order, grant } = await simulatedCheckout()
    await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })

    const page = await visit(`/checkout/orders/${order.publicId}`)
    await page.getByRole('link', { name: 'Pay now', exact: true }).click()
    await page.getByRole('button', { name: 'Simulate successful payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    await runQueue(['payments', 'notifications', 'maintenance'])

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Invoice', exact: true }).click(),
    ])
    const pdf = await readFile((await download.path())!)

    assert.include(pdf.toString('latin1'), 'Lantern Goods')
  })
})
