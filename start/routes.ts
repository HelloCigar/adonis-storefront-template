/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

const FakePayMongoController = () => import('#providers/payments/fake_paymongo_controller')

router.get('/', [controllers.storefront.Storefront, 'index']).as('home')
router.get('/collections', [controllers.storefront.Collections, 'index']).as('collections.index')
router
  .get('/collection/:handle', [controllers.storefront.Collections, 'show'])
  .as('collections.show')
router.get('/product/:handle', [controllers.storefront.Products, 'show']).as('products.show')
router.get('/pages/:handle', [controllers.content.Pages, 'show']).as('pages.show')
router.get('/policies', [controllers.content.Policies, 'index']).as('policies.index')
router.get('/policies/:handle', [controllers.content.Policies, 'show']).as('policies.show')
router.get('/blog/:handle', [controllers.content.Blogs, 'show']).as('blogs.show')
router.get('/blog/:handle/:article', [controllers.content.Articles, 'show']).as('articles.show')
router.post('/store/cart', [controllers.storefront.Cart, 'store']).as('cart.add')
router.patch('/store/cart/:id', [controllers.storefront.Cart, 'update']).as('cart.update')
router.delete('/store/cart/:id', [controllers.storefront.Cart, 'destroy']).as('cart.remove')
router.get('/checkout', [controllers.checkout.Checkout, 'create']).as('checkout.create')
router.post('/checkout', [controllers.checkout.Checkout, 'store']).as('checkout.store')
router
  .get('/checkout/orders/:publicId/access', [controllers.checkout.OrderAccess, 'show'])
  .as('checkout.access.show')
router
  .post('/checkout/orders/:publicId/claim', [controllers.checkout.OrderAccess, 'store'])
  .as('checkout.access.store')
  .use(middleware.auth())
router
  .get('/checkout/orders/:publicId', [controllers.checkout.Orders, 'show'])
  .as('checkout.orders.show')
router
  .post('/checkout/orders/:publicId/cancel', [controllers.checkout.Cancellations, 'store'])
  .as('checkout.cancellations.store')
router
  .post('/checkout/orders/:publicId/reconcile', [controllers.checkout.Reconciliations, 'store'])
  .as('checkout.reconciliations.store')
router
  .post('/payments/webhooks/:provider', [controllers.payments.Webhooks, 'store'])
  .as('payments.webhooks.store')
router
  .get('/_dev/paymongo/checkouts/:id', [FakePayMongoController, 'show'])
  .as('payments.simulations.show')
router
  .post('/_dev/paymongo/checkouts/:id', [FakePayMongoController, 'store'])
  .as('payments.simulations.store')

router
  .group(() => {
    router.get('signup', [controllers.auth.NewAccount, 'create']).as('new_account.create')
    router.post('signup', [controllers.auth.NewAccount, 'store']).as('new_account.store')

    router.get('login', [controllers.auth.Session, 'create']).as('session.create')
    router.post('login', [controllers.auth.Session, 'store']).as('session.store')
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('/account', [controllers.account.Account, 'show']).as('account.show')
    router.get('/account/logout', [controllers.account.Logout, 'show']).as('account.logout')
    router
      .patch('/account/profile', [controllers.account.Profile, 'update'])
      .as('account.profile.update')
    router
      .post('/account/addresses', [controllers.account.Addresses, 'store'])
      .as('account.addresses.create')
    router
      .patch('/account/addresses/:id', [controllers.account.Addresses, 'update'])
      .as('account.addresses.update')
    router
      .post('/account/addresses/:id/default', [controllers.account.DefaultAddress, 'update'])
      .as('account.addresses.default')
    router
      .delete('/account/addresses/:id', [controllers.account.Addresses, 'destroy'])
      .as('account.addresses.delete')
    router.get('/account/orders', [controllers.account.Orders, 'index']).as('orders.index')
    router.get('/account/orders/:id', [controllers.account.Orders, 'show']).as('orders.show')
    router
      .get('/dashboard', [controllers.dashboard.Dashboard, 'index'])
      .as('dashboard')
      .use(middleware.staff())
    router.get('/inbox', [controllers.dashboard.Inbox, 'index']).as('inbox').use(middleware.staff())
    router
      .get('/customers', [controllers.seller.Customers, 'index'])
      .as('customers')
      .use(middleware.staff())
    router.get('/settings', [controllers.settings.Settings, 'index']).as('settings')
    router.post('/settings', [controllers.settings.Settings, 'update']).as('settings.update')
    router
      .delete('/settings/avatar', [controllers.settings.Avatar, 'destroy'])
      .as('settings.avatar.destroy')
    router.get('/settings/members', [controllers.settings.Members, 'index']).as('settings.members')
    router
      .get('/settings/notifications', [controllers.settings.Notifications, 'index'])
      .as('settings.notifications')
    router
      .get('/settings/security', [controllers.settings.Security, 'show'])
      .as('settings.security')
    router
      .post('/settings/security', [controllers.settings.Security, 'update'])
      .as('settings.password.update')
    router.post('logout', [controllers.auth.Session, 'destroy']).as('session.destroy')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/products', [controllers.seller.Products, 'index']).as('products.index')
    router.post('/products', [controllers.seller.Products, 'store']).as('products.store')
    router.patch('/products/:id', [controllers.seller.Products, 'update']).as('products.update')
    router.delete('/products/:id', [controllers.seller.Products, 'destroy']).as('products.destroy')
    router
      .get('/products/:productId/variants', [controllers.seller.Variants, 'index'])
      .as('variants.index')
    router
      .post('/products/:productId/variants', [controllers.seller.Variants, 'store'])
      .as('variants.store')
    router
      .patch('/products/:productId/options', [controllers.seller.Options, 'update'])
      .as('options.update')
    router
      .post('/products/:productId/variants/generate', [
        controllers.seller.VariantGeneration,
        'store',
      ])
      .as('variant_generation.store')
    router
      .patch('/products/:productId/variants/:id', [controllers.seller.Variants, 'update'])
      .as('variants.update')
    router
      .delete('/products/:productId/variants/:id', [controllers.seller.Variants, 'destroy'])
      .as('variants.destroy')
    router
      .post('/products/:productId/images', [controllers.seller.Images, 'store'])
      .as('images.store')
    router
      .delete('/products/:productId/images/:id', [controllers.seller.Images, 'destroy'])
      .as('images.destroy')
    router.get('/collections', [controllers.seller.Collections, 'index']).as('collections.index')
    router.post('/collections', [controllers.seller.Collections, 'store']).as('collections.store')
    router
      .patch('/collections/:id', [controllers.seller.Collections, 'update'])
      .as('collections.update')
    router
      .delete('/collections/:id', [controllers.seller.Collections, 'destroy'])
      .as('collections.destroy')
    router.get('/orders', [controllers.seller.Orders, 'index']).as('orders.index')
    router.get('/orders/:id', [controllers.seller.Orders, 'show']).as('orders.show')
    router.patch('/orders/:id', [controllers.seller.Orders, 'update']).as('orders.update')
    router.post('/orders/:id/packing', [controllers.seller.Packing, 'store']).as('packing.store')
    router
      .post('/orders/:id/shipment', [controllers.seller.Shipments, 'store'])
      .as('shipments.store')
    router.post('/orders/:id/refund', [controllers.seller.Refunds, 'store']).as('refunds.store')
    router
      .post('/orders/:id/cancel', [controllers.seller.Cancellations, 'store'])
      .as('cancellations.store')
    router
      .post('/orders/:id/operations', [controllers.seller.Operations, 'store'])
      .as('operations.store')
    router.get('/users', [controllers.seller.Users, 'index']).as('users.index')
    router.post('/users', [controllers.seller.Users, 'store']).as('users.store')
    router.patch('/users/:id', [controllers.seller.Users, 'update']).as('users.update')
    router.delete('/users/:id', [controllers.seller.Users, 'destroy']).as('users.destroy')
  })
  .prefix('/seller')
  .as('seller')
  .use([middleware.auth(), middleware.staff()])
