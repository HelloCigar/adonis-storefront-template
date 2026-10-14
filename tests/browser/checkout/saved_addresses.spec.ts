import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { cartReady, useFakeProvider } from '#tests/helpers/payments'
import InventoryService from '#services/catalog/inventory_service'
import StockReservation from '#models/checkout/stock_reservation'
import OrderAddress from '#models/checkout/order_address'
import { UserFactory } from '#database/factories/user_factory'
import { CustomerAddressFactory } from '#database/factories/customer_address_factory'

test.group('Checkout with saved addresses', (group) => {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      const inventory = await app.container.make(InventoryService)
      const held = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(held.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await truncate()
    }
  })

  test('a customer checks out to a saved address, starting from their default', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    useFakeProvider([new FakePaymentAdapter('browser-sandbox')])
    const user = await UserFactory.apply('verified').create()
    await CustomerAddressFactory.merge({
      userId: user.id,
      address1: '1 Old Road',
      phoneNumber: '09170000001',
    }).create()
    const home = await CustomerAddressFactory.merge({
      userId: user.id,
      address1: '2 Home Street',
      phoneNumber: '09170000002',
    }).create()
    user.defaultAddressId = home.id
    await user.save()
    const { token } = await cartReady({ customer: user })
    await browserContext.loginAs(user)
    await browserContext.setSession({ store_cart_token: token })

    const page = await visit(route('checkout.create'))
    const street = page.getByLabel('Street address', { exact: true })
    assert.equal(await street.inputValue(), '2 Home Street')

    await page.getByText('1 Old Road', { exact: false }).click()
    assert.equal(await street.inputValue(), '1 Old Road')

    await page.getByRole('radio', { name: 'Use a new address', exact: true }).click()
    assert.equal(await street.inputValue(), '')

    await page.getByText('2 Home Street', { exact: false }).click()
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Preparing your payment', exact: true }).waitFor()

    const shipping = await OrderAddress.query().where('type', 'shipping').firstOrFail()
    assert.equal(shipping.address1, '2 Home Street')
    assert.equal(shipping.phoneNumber, '09170000002')
  })
})
