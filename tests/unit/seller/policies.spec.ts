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

function actor(role: UserRole, id = '1') {
  const user = new User()
  user.id = id
  user.role = role
  return user
}

test.group('Shared store policies', () => {
  test('staff and admins share catalogue access while customer and guest access is denied', async ({
    assert,
  }) => {
    const product = new Product()
    product.id = '10'
    const variant = new ProductVariant()
    variant.productId = product.id
    const collection = new Collection()
    const target = actor('customer', '4')
    for (const creator of [null, '1', '2']) {
      product.sellerId = creator
      collection.sellerId = creator
      for (const user of [
        null,
        actor('customer'),
        actor('staff'),
        actor('staff', '2'),
        actor('admin', '3'),
      ]) {
        const bouncer = new Bouncer<User>(user)
        const allowed = Boolean(user?.isStoreStaff)
        const checks = {
          access: await bouncer.with(AccessPolicy).allows('access'),
          listProducts: await bouncer.with(ProductPolicy).allows('viewAny'),
          createProduct: await bouncer.with(ProductPolicy).allows('create'),
          updateProduct: await bouncer.with(ProductPolicy).allows('update', product),
          deleteProduct: await bouncer.with(ProductPolicy).allows('delete', product),
          listVariants: await bouncer.with(VariantPolicy).allows('viewAny', product),
          createVariant: await bouncer.with(VariantPolicy).allows('create', product),
          updateVariant: await bouncer.with(VariantPolicy).allows('update', variant, product),
          deleteVariant: await bouncer.with(VariantPolicy).allows('delete', variant, product),
          uploadImages: await bouncer.with(ImagePolicy).allows('create', product),
          deleteImage: await bouncer.with(ImagePolicy).allows('delete', product),
          listCollections: await bouncer.with(CollectionPolicy).allows('viewAny'),
          createCollection: await bouncer.with(CollectionPolicy).allows('create'),
          updateCollection: await bouncer.with(CollectionPolicy).allows('update', collection),
          deleteCollection: await bouncer.with(CollectionPolicy).allows('delete', collection),
          attachProducts: await bouncer
            .with(CollectionPolicy)
            .allows('attachProducts', collection, [product]),
        }
        for (const [action, result] of Object.entries(checks)) assert.equal(result, allowed, action)
        const userChecks = [
          await bouncer.with(UserPolicy).allows('viewAny'),
          await bouncer.with(UserPolicy).allows('create'),
          await bouncer.with(UserPolicy).allows('update', target),
          await bouncer.with(UserPolicy).allows('delete', target),
          ...(await Promise.all(
            (['customer', 'staff', 'admin'] as const).map((role) =>
              bouncer.with(UserPolicy).allows('assignRole', role)
            )
          )),
        ]
        assert.deepEqual(userChecks, Array(userChecks.length).fill(user?.role === 'admin'))
      }
    }
  })

  test('variant parent associations are enforced for both staff and admins', async ({ assert }) => {
    const product = new Product()
    product.id = '1'
    const variant = new ProductVariant()
    variant.productId = '2'
    for (const user of [actor('staff'), actor('admin')]) {
      const bouncer = new Bouncer(user)
      assert.isFalse(await bouncer.with(VariantPolicy).allows('update', variant, product))
      assert.isFalse(await bouncer.with(VariantPolicy).allows('delete', variant, product))
    }
  })

  test('order access does not depend on line-item creator attribution or missing items', async ({
    assert,
  }) => {
    for (const creators of [[], [null], ['1', '2'], ['1', null], ['2'], ['1', '1']]) {
      const order = new Order()
      order.$setRelated(
        'lineItems',
        creators.map((sellerId) => {
          const item = new OrderLineItem()
          item.sellerId = sellerId
          return item
        })
      )
      for (const user of [
        null,
        actor('customer'),
        actor('staff'),
        actor('staff', '2'),
        actor('admin'),
      ]) {
        const bouncer = new Bouncer<User>(user)
        assert.equal(
          await bouncer.with(OrderPolicy).allows('view', order),
          Boolean(user?.isStoreStaff)
        )
        assert.equal(
          await bouncer.with(OrderPolicy).allows('update', order),
          Boolean(user?.isStoreStaff)
        )
      }
    }
  })

  test('admins may edit their profile but cannot delete themselves or change their own role', async ({
    assert,
  }) => {
    const admin = actor('admin')
    const bouncer = new Bouncer(admin)
    assert.isTrue(await bouncer.with(UserPolicy).allows('update', admin))
    assert.isFalse(await bouncer.with(UserPolicy).allows('delete', admin))
    assert.isTrue(await bouncer.with(UserPolicy).allows('assignRole', 'admin', admin))
    assert.isFalse(await bouncer.with(UserPolicy).allows('assignRole', 'staff', admin))
    assert.isFalse(await bouncer.with(UserPolicy).allows('assignRole', 'customer', admin))
  })
})
