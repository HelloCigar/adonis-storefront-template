import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import database from '@adonisjs/lucid/services/db'
import CartService from '#services/checkout/cart_service'
import InventoryService from '#services/catalog/inventory_service'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { CollectionFactory } from '#database/factories/collection_factory'
import AssistantModelProvider from '#assistant/model_provider'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { assistantOn } from '#tests/helpers/assistant'
import { finishedStoreSetup } from '#tests/helpers/store_setup'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'

test.group('Shopping assistant widget', (group) => {
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

  test("the shopping assistant isn't offered during {step}")
    .with([
      { step: 'checkout', heading: 'Checkout' },
      { step: 'payment', heading: 'Local payment simulator' },
    ] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      await assistantOn()
      let url: string
      if (row.step === 'checkout') {
        const variant = await ProductVariantFactory.merge({ inventoryQuantity: 2 }).create()
        const token = randomUUID()
        const carts = await app.container.make(CartService)
        await carts.add(token, undefined, variant.id, 1)
        await browserContext.setSession({ store_cart_token: token })
        url = route('checkout.create')
      } else {
        const { order, attempt, grant } = await simulatedCheckout()
        await browserContext.setSession({ store_order_grants: { [order.publicId!]: grant } })
        const id = new URL(attempt.checkoutUrl!).pathname.split('/').at(-1)!
        url = route('payments.simulations.show', { id: decodeURIComponent(id) })
      }

      const page = await visit(url)

      await page.getByRole('heading', { name: row.heading, exact: true }).waitFor()
      await page.assertNotExists(
        page.getByRole('button', { name: 'Open shopping assistant', exact: true })
      )
    })

  test("the shopping assistant isn't offered when {reason}")
    .with([
      { reason: 'switched off', enabled: false, configured: true },
      { reason: 'no AI service', enabled: true, configured: false },
    ] as const)
    .run(async ({ visit, route, swap }, row) => {
      const settings = await finishedStoreSetup({ storeName: 'Lantern Goods' })
      settings.shoppingAssistantEnabled = row.enabled
      await settings.save()
      swap(AssistantModelProvider, new FakeAssistantModelProvider(row.configured))

      const page = await visit(route('home'))

      await page.getByRole('link', { name: 'Lantern Goods', exact: true }).first().waitFor()
      await page.assertNotExists(
        page.getByRole('button', { name: 'Open shopping assistant', exact: true })
      )
    })

  test("opening the assistant says it's an AI and that the store may review conversations", async ({
    visit,
    route,
  }) => {
    await assistantOn()

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('AI', { exact: true }))
    await page.assertVisible(
      dialog.getByText('Conversations may be reviewed by the store.', { exact: true })
    )
  })

  test('the suggested questions fit the {page} page')
    .with([
      { page: 'product', question: 'What sizes are in stock?' },
      { page: 'collection', question: "What's popular in this collection?" },
      { page: 'home', question: 'How much is shipping?' },
    ] as const)
    .run(async ({ visit, route, assert }, row) => {
      await assistantOn()
      let url = route('home')
      if (row.page === 'product') {
        const product = await ProductFactory.apply('published').with('variants', 1).create()
        url = route('products.show', { handle: product.handle })
      } else if (row.page === 'collection') {
        const collection = await CollectionFactory.apply('published')
          .with('products', 1, (product) => product.apply('published').with('variants', 1))
          .create()
        url = route('collections.show', { handle: collection.handle })
      }

      const page = await visit(url)
      await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

      const suggestions = page.getByRole('group', { name: 'Suggested questions', exact: true })
      await page.assertVisible(suggestions.getByRole('button', { name: row.question, exact: true }))
      assert.equal(await suggestions.getByRole('button').count(), 3)
    })
})
