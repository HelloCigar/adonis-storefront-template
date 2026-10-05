import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import { optionCombinationKey } from '#services/catalog/options_service'
import Collection from '#models/catalog/collection'
import User from '#models/account/user'
import Cart from '#models/checkout/cart'
import Order from '#models/checkout/order'
import { ProductFactory } from '../factories/product_factory.js'
import { ProductVariantFactory } from '../factories/product_variant_factory.js'
import { CollectionFactory } from '../factories/collection_factory.js'
import { UserFactory } from '../factories/user_factory.js'
import { CustomerAddressFactory } from '../factories/customer_address_factory.js'
import { CartFactory } from '../factories/cart_factory.js'
import { CartLineFactory } from '../factories/cart_line_factory.js'
import { OrderFactory } from '../factories/order_factory.js'

const groups = [
  {
    title: 'Everyday essentials',
    handle: 'demo-everyday',
    products: [
      'Canvas Tote',
      'Everyday Backpack',
      'Zip Pouch',
      'Travel Organizer',
      'Pocket Wallet',
      'Weekend Bag',
    ],
  },
  {
    title: 'At home',
    handle: 'demo-home',
    products: [
      'Ceramic Mug',
      'Linen Cushion',
      'Stoneware Bowl',
      'Woven Throw',
      'Glass Carafe',
      'Oak Tray',
    ],
  },
  {
    title: 'Workspace',
    handle: 'demo-workspace',
    products: ['Desk Lamp', 'Notebook', 'Pen Holder', 'Desk Mat', 'Book Stand', 'Cable Organizer'],
  },
]
const colors = ['Natural', 'Slate', 'Olive']

export default class MainSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    if (!MainSeeder.environment.includes(app.nodeEnvironment)) return

    // Only insert missing demo records; never truncate or reset an existing database.
    await this.client.transaction(async (trx) => {
      const products: Product[] = []
      for (const [groupIndex, group] of groups.entries()) {
        const members: Product[] = []
        for (const [index, title] of group.products.entries()) {
          const handle = 'demo-' + title.toLowerCase().replaceAll(' ', '-')
          let product = await Product.query({ client: trx }).where('handle', handle).first()
          if (!product) {
            product = await ProductFactory.client(trx)
              .apply('published', 'withMedia')
              .merge({
                title,
                handle,
                vendor: groupIndex === 1 ? 'Clay & Linen' : 'North Studio',
                productType: group.title,
                description: 'A thoughtfully made ' + title.toLowerCase() + ' for everyday use.',
                descriptionHtml:
                  '<p>Simple materials, considered details, made for everyday use.</p>',
                tags: ['demo', group.handle.replace('demo-', '')],
                seoTitle: title,
              })
              .create()
          }
          product.useTransaction(trx)
          // Older demo data may have products without their price and stock variants.
          if (!(await product.related('variants').query().first())) {
            product.optionDefinitions = [{ name: 'Color', values: [...colors] }]
            await product.save()
            const price = 299 + groupIndex * 200 + index * 100
            const soldOut = groupIndex === 2 && index === 5
            const media = await product.media.all()
            await ProductVariantFactory.client(trx)
              .merge(
                colors.map((color, position) => ({
                  productId: product.id,
                  title: color,
                  position,
                  sku: handle.toUpperCase() + '-' + position,
                  options: { Color: color },
                  optionCombinationKey: optionCombinationKey({ Color: color }),
                  priceAmount: price + position * 50,
                  compareAtPriceAmount: index % 3 === 0 ? price + position * 50 + 150 : null,
                  availableForSale: !soldOut,
                  inventoryQuantity: soldOut ? 0 : 25,
                  featuredMediaId: media[0]?.id ?? null,
                }))
              )
              .createMany(colors.length)
          }
          products.push(product)
          members.push(product)
        }

        let collection = await Collection.query({ client: trx })
          .where('handle', group.handle)
          .first()
        if (!collection) {
          collection = await CollectionFactory.client(trx)
            .apply('published', 'withImage')
            .merge({
              title: group.title,
              handle: group.handle,
              seoTitle: group.title,
              description: 'Discover considered pieces for ' + group.title.toLowerCase() + '.',
            })
            .create()
          collection.useTransaction(trx)
        }
        const existing = await collection.related('products').query().select('products.id')
        const existingIds = new Set(existing.map((product) => product.id))
        const missing = Object.fromEntries(
          members
            .map((product, position) => [product.id, { position }])
            .filter(([id]) => !existingIds.has(Number(id)))
        )
        if (Object.keys(missing).length) await collection.related('products').attach(missing)
      }

      const email = 'demo@example.com'
      let customer = await User.query({ client: trx }).where('email', email).first()
      if (!customer) {
        customer = await UserFactory.client(trx)
          .merge({
            email,
            password: 'demo-password',
            firstName: 'Mina',
            lastName: 'Rivera',
            fullName: 'Mina Rivera',
          })
          .create()
        customer.useTransaction(trx)
      }
      let address = await customer
        .related('addresses')
        .query()
        .where('address1', '10 Demo Street')
        .first()
      if (!address)
        address = await CustomerAddressFactory.client(trx)
          .merge({
            userId: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            address1: '10 Demo Street',
            city: 'Manila',
            postalCode: '1000',
            countryCode: 'PH',
          })
          .create()
      if (!customer.defaultAddressId) {
        customer.defaultAddressId = address.id
        await customer.save()
      }

      const variants = await ProductVariant.query({ client: trx })
        .whereIn(
          'product_id',
          products.map((product) => product.id)
        )
        .where('available_for_sale', true)
        .orderBy('id')
        .limit(2)
      if (!variants.length) return
      let cart = await Cart.query({ client: trx }).where('token', 'demo-active-cart').first()
      if (!cart) {
        cart = await CartFactory.client(trx)
          .merge({ token: 'demo-active-cart', userId: customer.id, email })
          .create()
        cart.useTransaction(trx)
      }
      for (const variant of variants) {
        const existing = await cart
          .related('lines')
          .query()
          .where('product_variant_id', variant.id)
          .first()
        if (!existing)
          await CartLineFactory.client(trx)
            .merge({ cartId: cart.id, productVariantId: variant.id })
            .create()
      }

      for (const [index, number] of ['DEMO-1001', 'DEMO-1002'].entries()) {
        const existing = await Order.query({ client: trx }).where('number', number).first()
        if (existing) continue
        await OrderFactory.client(trx)
          .apply('paid', ...(index === 0 ? ['fulfilled' as const] : []))
          .merge({ number, userId: customer.id, email, shippingMinor: 10_000 })
          .with('addresses', 2, (addresses) =>
            addresses.merge(
              ['shipping', 'billing'].map((type) => ({
                type,
                firstName: customer!.firstName,
                lastName: customer!.lastName,
                address1: address!.address1,
                city: address!.city,
                countryCode: address!.countryCode,
                postalCode: address!.postalCode,
              }))
            )
          )
          .with('lineItems', variants.length, (lines) =>
            lines.merge(
              variants.map((variant) => ({
                productVariantId: variant.id,
                quantity: index + 1,
              }))
            )
          )
          .create()
      }
    })
  }
}
