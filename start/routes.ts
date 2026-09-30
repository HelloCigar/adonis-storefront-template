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

router.get('/', [controllers.Storefront, 'index']).as('home')
router.get('/collections', [controllers.Collections, 'index']).as('collections.index')
router.get('/collection/:handle', [controllers.Collections, 'show']).as('collections.show')
router.get('/product/:handle', [controllers.Products, 'show']).as('products.show')
router.get('/pages/:handle', [controllers.Content, 'page']).as('pages.show')
router.get('/policies', [controllers.Content, 'policies']).as('policies.index')
router.get('/policies/:handle', [controllers.Content, 'policy']).as('policies.show')
router.get('/blog/:handle', [controllers.Content, 'blog']).as('blogs.show')
router.get('/blog/:handle/:article', [controllers.Content, 'article']).as('articles.show')
router.post('/store/cart', [controllers.Cart, 'add']).as('cart.add')
router.patch('/store/cart/:id', [controllers.Cart, 'update']).as('cart.update')
router.delete('/store/cart/:id', [controllers.Cart, 'remove']).as('cart.remove')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('/account', [controllers.Account, 'show']).as('account.show')
    router.get('/account/logout', [controllers.Account, 'logout']).as('account.logout')
    router
      .patch('/account/profile', [controllers.Account, 'updateProfile'])
      .as('account.profile.update')
    router
      .post('/account/addresses', [controllers.Account, 'createAddress'])
      .as('account.addresses.create')
    router
      .patch('/account/addresses/:id', [controllers.Account, 'updateAddress'])
      .as('account.addresses.update')
    router
      .post('/account/addresses/:id/default', [controllers.Account, 'defaultAddress'])
      .as('account.addresses.default')
    router
      .delete('/account/addresses/:id', [controllers.Account, 'deleteAddress'])
      .as('account.addresses.delete')
    router.get('/account/orders', [controllers.Orders, 'index']).as('orders.index')
    router.get('/account/orders/:id', [controllers.Orders, 'show']).as('orders.show')
    router.get('/dashboard', [controllers.Dashboard, 'index']).as('dashboard')
    router.get('/inbox', [controllers.Inbox, 'index']).as('inbox')
    router.get('/customers', [controllers.Customers, 'index']).as('customers')
    router.get('/settings', [controllers.Settings, 'index']).as('settings')
    router.post('/settings', [controllers.Settings, 'update']).as('settings.update')
    router
      .delete('/settings/avatar', [controllers.Settings, 'destroyAvatar'])
      .as('settings.avatar.destroy')
    router.get('/settings/members', [controllers.Settings, 'members']).as('settings.members')
    router
      .get('/settings/notifications', [controllers.Settings, 'notifications'])
      .as('settings.notifications')
    router.get('/settings/security', [controllers.Settings, 'security']).as('settings.security')
    router
      .post('/settings/security', [controllers.Settings, 'updatePassword'])
      .as('settings.password.update')
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
