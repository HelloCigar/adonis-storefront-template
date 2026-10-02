import { test } from '@japa/runner'
import { Bouncer } from '@adonisjs/bouncer'
import User, { type UserRole } from '#models/account/user'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import Collection from '#models/catalog/collection'
import Order from '#models/checkout/order'
import OrderLineItem from '#models/checkout/order_line_item'
import AccessPolicy from '#policies/seller/access_policy'
import ProductPolicy from '#policies/seller/product_policy'
import VariantPolicy from '#policies/seller/variant_policy'
import ImagePolicy from '#policies/seller/image_policy'
import CollectionPolicy from '#policies/seller/collection_policy'
import OrderPolicy from '#policies/seller/order_policy'
import UserPolicy from '#policies/seller/user_policy'

function actor(role: UserRole, id = 1) {
  const user = new User()
  user.id = id
  user.role = role
  return user
}

test.group('Seller policies', () => {
  test('requires seller ownership for every resource action and grants admins access', async ({
    assert,
  }) => {
    const product = new Product()
    product.id = 10
    product.sellerId = 1
    const variant = new ProductVariant()
    variant.productId = product.id
    const collection = new Collection()
    collection.sellerId = 1
    const order = new Order()
    const item = new OrderLineItem()
    item.sellerId = 1
    order.$setRelated('lineItems', [item])

    for (const user of [
      null,
      actor('customer'),
      actor('seller'),
      actor('seller', 2),
      actor('admin', 3),
    ]) {
      const bouncer = new Bouncer<User>(user)
      const sellerAccess = user?.role === 'seller' || user?.role === 'admin'
      const ownerAccess = user?.role === 'admin' || (user?.role === 'seller' && user.id === 1)
      const listChecks = [
        await bouncer.with(AccessPolicy).allows('access'),
        await bouncer.with(ProductPolicy).allows('viewAny'),
        await bouncer.with(ProductPolicy).allows('create'),
        await bouncer.with(CollectionPolicy).allows('viewAny'),
        await bouncer.with(CollectionPolicy).allows('create'),
        await bouncer.with(OrderPolicy).allows('viewAny'),
      ]
      assert.deepEqual(listChecks, Array(listChecks.length).fill(sellerAccess))
      const checks = {
        updateProduct: await bouncer.with(ProductPolicy).allows('update', product),
        deleteProduct: await bouncer.with(ProductPolicy).allows('delete', product),
        listVariants: await bouncer.with(VariantPolicy).allows('viewAny', product),
        createVariant: await bouncer.with(VariantPolicy).allows('create', product),
        updateVariant: await bouncer.with(VariantPolicy).allows('update', variant, product),
        deleteVariant: await bouncer.with(VariantPolicy).allows('delete', variant, product),
        uploadImages: await bouncer.with(ImagePolicy).allows('create', product),
        deleteImage: await bouncer.with(ImagePolicy).allows('delete', product),
        updateCollection: await bouncer.with(CollectionPolicy).allows('update', collection),
        deleteCollection: await bouncer.with(CollectionPolicy).allows('delete', collection),
        attachProducts: await bouncer
          .with(CollectionPolicy)
          .allows('attachProducts', collection, [product]),
        viewOrder: await bouncer.with(OrderPolicy).allows('view', order),
        updateOrder: await bouncer.with(OrderPolicy).allows('update', order),
      }
      for (const [action, result] of Object.entries(checks)) {
        assert.equal(result, ownerAccess, `${user?.role || 'guest'} ${user?.id}: ${action}`)
      }
      const target = actor('customer', 4)
      const userChecks = [
        await bouncer.with(UserPolicy).allows('viewAny'),
        await bouncer.with(UserPolicy).allows('create'),
        await bouncer.with(UserPolicy).allows('update', target),
        await bouncer.with(UserPolicy).allows('delete', target),
        await bouncer.with(UserPolicy).allows('assignRole', 'customer'),
        await bouncer.with(UserPolicy).allows('assignRole', 'seller'),
        await bouncer.with(UserPolicy).allows('assignRole', 'admin'),
      ]
      assert.deepEqual(userChecks, Array(userChecks.length).fill(user?.role === 'admin'))
    }
  })

  test('rejects foreign collection members and variants even when the parent is owned', async ({
    assert,
  }) => {
    const seller = new Bouncer(actor('seller'))
    const product = new Product()
    product.id = 1
    product.sellerId = 1
    const foreign = new Product()
    foreign.id = 2
    foreign.sellerId = 2
    const collection = new Collection()
    collection.sellerId = 1
    const variant = new ProductVariant()
    variant.productId = foreign.id
    assert.isFalse(
      await seller.with(CollectionPolicy).allows('attachProducts', collection, [product, foreign])
    )
    assert.isFalse(await seller.with(VariantPolicy).allows('update', variant, product))
    assert.isFalse(await seller.with(VariantPolicy).allows('delete', variant, product))
    product.sellerId = null
    assert.isFalse(await seller.with(ProductPolicy).allows('update', product))
    assert.isFalse(await seller.with(ImagePolicy).allows('create', product))
  })

  test('requires every order item to belong to the seller while admins bypass ownership', async ({
    assert,
  }) => {
    const seller = new Bouncer(actor('seller'))
    const admin = new Bouncer(actor('admin', 3))
    for (const sellers of [[], [null], [1, 2], [1, null], [2], [1, 1]]) {
      const order = new Order()
      order.$setRelated(
        'lineItems',
        sellers.map((sellerId) => {
          const item = new OrderLineItem()
          item.sellerId = sellerId
          return item
        })
      )
      const allowed = sellers.length > 0 && sellers.every((id) => id === 1)
      assert.equal(await seller.with(OrderPolicy).allows('view', order), allowed)
      assert.equal(await seller.with(OrderPolicy).allows('update', order), allowed)
      assert.isTrue(await admin.with(OrderPolicy).allows('view', order))
      assert.isTrue(await admin.with(OrderPolicy).allows('update', order))
    }
  })
})
