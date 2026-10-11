import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import app from '@adonisjs/core/services/app'
import { AttachmentModel } from '@jrmc/adonis-attachment/lucid'
import Product from '#models/catalog/product'
import Collection from '#models/catalog/collection'
import User from '#models/account/user'
import Order from '#models/checkout/order'
import { UserFactory } from '#database/factories/user_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { CollectionFactory } from '#database/factories/collection_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { CartLineFactory } from '#database/factories/cart_line_factory'
import { CustomerAddressFactory } from '#database/factories/customer_address_factory'
import { OrderAddressFactory } from '#database/factories/order_address_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import MainSeeder from '#database/seeders/main_seeder'

test.group('Initial factories and seeder', (group) => {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      // Seeded checkouts awaiting payment hold stock, and held variants cannot be deleted.
      await db
        .from('product_variants')
        .where('inventory_reserved_quantity', '>', 0)
        .update({ inventory_reserved_quantity: 0 })
      await truncate()
    }
  })
  group.each.teardown(async () => {
    // Model hooks remove only the attachment files owned by these test fixtures.
    for (const product of await Product.all()) await product.delete()
    for (const collection of await Collection.all()) await collection.delete()
  })

  test('creates connected factory graphs and standalone dependent rows', async ({ assert }) => {
    const customer = await UserFactory.with('addresses', 2)
      .with('carts', 1, (carts) => carts.with('lines', 2))
      .with('orders', 1, (orders) => orders.apply('paid').with('addresses', 2).with('lineItems', 3))
      .create()
    await customer.load('addresses')
    await customer.load('carts', (carts) =>
      carts.preload('lines', (lines) => lines.preload('variant'))
    )
    await customer.load('orders', (orders) => orders.preload('lineItems').preload('addresses'))
    assert.lengthOf(customer.addresses, 2)
    assert.lengthOf(customer.carts[0].lines, 2)
    for (const line of customer.carts[0].lines) {
      assert.equal(line.unitPriceAmount, line.variant.priceAmount)
      assert.equal(line.currencyCode, line.variant.currencyCode)
    }
    const order = customer.orders[0]
    assert.equal(order.financialStatus, 'paid')
    assert.deepEqual(order.addresses.map((address) => address.type).sort(), ['billing', 'shipping'])
    assert.equal(
      order.subtotalAmount,
      order.lineItems.reduce(
        (sum, line) => sum + Math.round(line.unitPriceAmount * 100) * line.quantity,
        0
      ) / 100
    )
    assert.equal(order.totalAmount, order.subtotalAmount)

    const collection = await CollectionFactory.apply('published')
      .with('products', 2, (products) =>
        products
          .apply('published')
          .merge({ optionDefinitions: [{ name: 'Color', values: ['Red', 'Blue', 'Green'] }] })
          .with('variants', 3, (variants) =>
            variants.merge(
              ['Red', 'Blue', 'Green'].map((color) => ({ title: color, options: { Color: color } }))
            )
          )
      )
      .create()
    await collection.load('products', (products) => products.preload('variants'))
    assert.lengthOf(collection.products, 2)
    for (const product of collection.products) {
      assert.deepEqual(product.tags, ['demo'])
      assert.deepEqual(product.variants.map((variant) => variant.position).sort(), [0, 1, 2])
    }

    const variant = await ProductVariantFactory.apply('soldOut').create()
    assert.isFalse(variant.availableForSale)
    assert.equal(variant.inventoryQuantity, 0)
    const line = await CartLineFactory.create()
    assert.isAbove(line.cartId, 0)
    assert.isAbove(line.productVariantId, 0)
    const address = await CustomerAddressFactory.create()
    assert.isAbove(address.userId, 0)
    const shipping = await OrderAddressFactory.create()
    assert.isAbove(shipping.orderId, 0)
    const snapshot = await OrderLineItemFactory.create()
    assert.equal(
      snapshot.totalAmount,
      (Math.round(snapshot.unitPriceAmount * 100) * snapshot.quantity) / 100
    )
    assert.isAbove(snapshot.orderId, 0)
  }).timeout(60_000)

  test('persists opt-in media through attachment relations without remote requests', async ({
    assert,
  }) => {
    const draft = await ProductFactory.apply('withMedia').make()
    assert.isFalse(draft.$isPersisted)
    assert.isNull(await AttachmentModel.first())
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ optionDefinitions: [{ name: 'Size', values: ['Small', 'Large'] }] })
      .with('variants', 2, (variants) =>
        variants
          .apply('discounted')
          .merge(['Small', 'Large'].map((size) => ({ title: size, options: { Size: size } })))
      )
      .create()
    const collection = await CollectionFactory.apply('withImage').create()
    const images = await product.media.all()
    const image = await collection.image.get()
    assert.lengthOf(images, 1)
    assert.isNotNull(image)
    assert.equal(images[0].attachment.mimeType, 'image/svg+xml')
    assert.deepEqual(images[0].attachment.metadata?.dimension, { width: 800, height: 800 })
    const attachments = await app.container.make('jrmc.attachment')
    const bytes = await attachments.read(images[0].toAttachment())
    assert.include(Buffer.from(bytes).toString(), '<svg')
    for (const variant of product.variants)
      assert.isAbove(variant.compareAtPriceAmount!, variant.priceAmount)
  })

  test('seeds the storefront twice without duplicating or overwriting data', async ({
    client,
    assert,
  }) => {
    const unrelated = await ProductFactory.merge({
      handle: 'my-own-product',
      title: 'My own product',
    }).create()
    const seeder = new MainSeeder(db.connection())
    await seeder.run()
    const countRows = async () => {
      const result: Record<string, number> = {}
      for (const table of [
        'users',
        'products',
        'product_variants',
        'collections',
        'collection_products',
        'customer_addresses',
        'carts',
        'cart_lines',
        'orders',
        'order_addresses',
        'order_line_items',
        'shipments',
        'payment_attempts',
        'payments',
        'stock_reservations',
        'adonis_attachments',
        'adonis_attachment_links',
      ]) {
        const row = await db.from(table).count('* as total').first()
        result[table] = Number(row.total)
      }
      return result
    }
    const initial = await countRows()
    assert.equal(initial.products, 19)
    assert.equal(initial.product_variants, 54)
    assert.equal(initial.collections, 3)
    assert.equal(initial.collection_products, 18)
    // Two manual orders plus one online order at each stage of the staff order queue.
    assert.equal(initial.orders, 9)
    assert.equal(initial.order_addresses, 18)
    assert.equal(initial.order_line_items, 14)
    assert.equal(initial.shipments, 5)
    assert.equal(initial.adonis_attachments, 21)
    const customer = await User.findByOrFail('email', 'demo@example.com')
    assert.isTrue(await hash.verify(customer.password, 'demo-password'))
    assert.isNotNull(customer.defaultAddressId)
    const order = await Order.query()
      .where('number', 'DEMO-1001')
      .preload('lineItems')
      .firstOrFail()
    assert.equal(
      order.totalAmount,
      order.lineItems.reduce((sum, line) => sum + line.totalAmount, 0) + 100
    )
    assert.isNotNull(order.lineItems[0].imageUrl)

    const response = await client.get('/product/demo-canvas-tote').withInertia()
    response.assertStatus(200)
    assert.deepEqual(response.inertiaProps.product.variants[0].selectedOptions, [
      { name: 'Color', value: 'Natural' },
    ])
    assert.equal(response.inertiaProps.product.featuredImage.width, 800)
    const file = await client.get(response.inertiaProps.product.featuredImage.url)
    file.assertStatus(200)
    file.assertHeader('content-type', 'image/svg+xml')

    const product = await Product.findByOrFail('handle', 'demo-canvas-tote')
    product.title = 'My edited demo product'
    await product.save()
    customer.password = 'my-new-password'
    await customer.save()
    await seeder.run()
    assert.deepEqual(await countRows(), initial)
    await product.refresh()
    await customer.refresh()
    await unrelated.refresh()
    assert.equal(product.title, 'My edited demo product')
    assert.isTrue(await hash.verify(customer.password, 'my-new-password'))
    assert.equal(unrelated.title, 'My own product')
    assert.deepEqual(MainSeeder.environment, ['development', 'test'])
  }).timeout(60_000)

  test('restores stock variants for existing demo products without changing existing inventory', async ({
    assert,
  }) => {
    const product = await ProductFactory.apply('published')
      .merge({ handle: 'demo-canvas-tote', title: 'My edited tote' })
      .create()
    const soldOut = await ProductFactory.apply('published')
      .merge({ handle: 'demo-cable-organizer' })
      .create()
    const customized = await ProductFactory.merge({ handle: 'demo-ceramic-mug' })
      .with('variants', 1, (variants) => variants.merge({ inventoryQuantity: 7, priceAmount: 123 }))
      .create()
    const unrelated = await ProductFactory.merge({ handle: 'my-own-product' }).create()
    const seeder = new MainSeeder(db.connection())

    await seeder.run()
    await product.load('variants')
    await soldOut.load('variants')
    await customized.load('variants')
    await unrelated.load('variants')
    assert.lengthOf(product.variants, 3)
    assert.deepEqual(
      product.variants.map((variant) => variant.inventoryQuantity),
      [25, 25, 25]
    )
    assert.deepEqual(
      product.variants.map((variant) => variant.priceAmount),
      [299, 349, 399]
    )
    assert.lengthOf(soldOut.variants, 3)
    for (const variant of soldOut.variants) {
      assert.equal(variant.inventoryQuantity, 0)
      assert.isFalse(Boolean(variant.availableForSale))
    }
    assert.lengthOf(customized.variants, 1)
    assert.equal(customized.variants[0].inventoryQuantity, 7)
    assert.equal(customized.variants[0].priceAmount, 123)
    assert.lengthOf(unrelated.variants, 0)
    const variantIds = product.variants.map((variant) => variant.id)

    await seeder.run()
    await product.refresh()
    await product.load('variants')
    await customized.load('variants')
    assert.equal(product.title, 'My edited tote')
    assert.deepEqual(
      product.variants.map((variant) => variant.id),
      variantIds
    )
    assert.lengthOf(customized.variants, 1)
    assert.equal(customized.variants[0].inventoryQuantity, 7)
  }).timeout(60_000)
})
