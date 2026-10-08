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

import {
  chatImageThrottle,
  checkoutThrottle,
  discountThrottle,
  loginThrottle,
  signupThrottle,
} from '#start/limiter'

const FakePayMongoController = () => import('#providers/payments/fake_paymongo_controller')

router.get('/', [controllers.storefront.Storefront, 'index']).as('home')
router
  .get('/attachments/:id/:name?', [controllers.media.Attachments, 'show'])
  .as('attachments.show')
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
router
  .group(() => {
    router.post('/store/cart', [controllers.storefront.Cart, 'store']).as('cart.add')
    router.patch('/store/cart/:id', [controllers.storefront.Cart, 'update']).as('cart.update')
    router.delete('/store/cart/:id', [controllers.storefront.Cart, 'destroy']).as('cart.remove')
  })
  .where('id', router.matchers.number())
router.get('/checkout', [controllers.checkout.Checkout, 'create']).as('checkout.create')
router
  .post('/checkout', [controllers.checkout.Checkout, 'store'])
  .as('checkout.store')
  .use(checkoutThrottle)
router
  .post('/checkout/discount', [controllers.checkout.Discounts, 'store'])
  .as('checkout.discount.store')
  .use(discountThrottle)
router
  .delete('/checkout/discount', [controllers.checkout.Discounts, 'destroy'])
  .as('checkout.discount.destroy')
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
    router
      .post('signup', [controllers.auth.NewAccount, 'store'])
      .as('new_account.store')
      .use(signupThrottle)

    router.get('login', [controllers.auth.Session, 'create']).as('session.create')
    router.post('login', [controllers.auth.Session, 'store']).as('session.store').use(loginThrottle)
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
      .post('/chat/orders/:orderId/messages', [controllers.chat.Messages, 'store'])
      .where('orderId', router.matchers.number())
      .as('chat.messages.store')
      .use(chatImageThrottle)
    router
      .get('/chat/orders/:orderId/images/:id', [controllers.chat.Images, 'show'])
      .where('orderId', router.matchers.number())
      // Attachment ids are UUIDs, so override the group's numeric id matcher.
      .where('id', { match: /^[\w-]+$/ })
      .as('chat.images.show')
    router
      .group(() => {
        router.get('/dashboard', [controllers.dashboard.Dashboard, 'index']).as('dashboard')
        router.get('/inbox', [controllers.dashboard.Inbox, 'index']).as('inbox')
        router.get('/customers', [controllers.seller.Customers, 'index']).as('customers')
      })
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
  .where('id', router.matchers.number())
  .use(middleware.auth())

router
  .group(() => {
    router
      .resource('products', controllers.seller.Products)
      .only(['index', 'store', 'update', 'destroy'])
    router
      .resource('products.variants', controllers.seller.Variants)
      .only(['index', 'store', 'update', 'destroy'])
      .params({ products: 'productId' })
      .as('variants')
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
      .get('/products/:productId/variants/:variantId/stock', [
        controllers.seller.StockAdjustments,
        'index',
      ])
      .as('stock_adjustments.index')
    router
      .post('/products/:productId/variants/:variantId/stock', [
        controllers.seller.StockAdjustments,
        'store',
      ])
      .as('stock_adjustments.store')
    router
      .post('/products/:productId/images', [controllers.seller.Images, 'store'])
      .as('images.store')
    router
      .delete('/products/:productId/images/:id', [controllers.seller.Images, 'destroy'])
      // Attachment ids are strings, so override the group's numeric id matcher.
      .where('id', { match: /^[\w-]+$/ })
      .as('images.destroy')
    router
      .resource('collections', controllers.seller.Collections)
      .only(['index', 'store', 'update', 'destroy'])
    router
      .resource('discounts', controllers.seller.Discounts)
      .only(['index', 'store', 'update', 'destroy'])
    router
      .resource('posts', controllers.seller.Posts)
      .only(['index', 'create', 'store', 'edit', 'update', 'destroy'])
    router.resource('orders', controllers.seller.Orders).only(['index', 'show', 'update'])
    router.post('/orders/:id/packing', [controllers.seller.Packing, 'store']).as('packing.store')
    router
      .post('/orders/:id/shipment', [controllers.seller.Shipments, 'store'])
      .as('shipments.store')
    router
      .post('/orders/:id/delivery', [controllers.seller.Deliveries, 'store'])
      .as('deliveries.store')
    router.post('/orders/:id/refund', [controllers.seller.Refunds, 'store']).as('refunds.store')
    router
      .post('/orders/:id/cancel', [controllers.seller.Cancellations, 'store'])
      .as('cancellations.store')
    router
      .post('/orders/:id/operations', [controllers.seller.Operations, 'store'])
      .as('operations.store')
    router.resource('users', controllers.seller.Users).only(['index', 'store', 'update', 'destroy'])
    router.get('/emails', [controllers.seller.Emails, 'index']).as('emails.index')
    router.get('/emails/:email', [controllers.seller.Emails, 'show']).as('emails.show')
  })
  .prefix('/seller')
  .as('seller')
  .where('id', router.matchers.number())
  .where('productId', router.matchers.number())
  .where('variantId', router.matchers.number())
  .use([middleware.auth(), middleware.staff()])
