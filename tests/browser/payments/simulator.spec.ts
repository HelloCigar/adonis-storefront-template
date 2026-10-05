import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import paymentConfig from '#config/payment'
import InventoryService from '#services/catalog/inventory_service'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'

test.group('Local payment simulator controls', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    const original = paymentConfig.defaultProvider
    paymentConfig.defaultProvider = 'fake_paymongo'
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      paymentConfig.defaultProvider = original
      const inventory = await app.container.make(InventoryService)
      const held = await db.from('stock_reservations').where('state', 'reserved')
      for (const id of new Set(held.map((row) => row.order_id)))
        await db.transaction((trx) => inventory.release(trx, id))
      await cleanup()
    }
  })

  test('a guest opens Pay now, retries a failed payment, and returns to a confirmed order', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, attempt, grant } = await simulatedCheckout()
    await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })
    const page = await visit(`/checkout/orders/${order.publicId}`)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('link', { name: 'Pay now', exact: true }).click()
    await page.getByRole('heading', { name: 'Local payment simulator', exact: true }).waitFor()
    await page.assertPath(new URL(attempt.checkoutUrl!).pathname)
    await page.getByRole('button', { name: 'Simulate failed payment', exact: true }).click()
    await page.getByRole('status').getByText('Payment failed.', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Simulate successful payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    await page.assertPath(`/checkout/orders/${order.publicId}`)
    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.isEmpty(errors)
  })
})
