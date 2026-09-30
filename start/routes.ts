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
router.get('/pages/:handle', [controllers.content.Pages, 'show']).as('pages.show')
router.get('/policies', [controllers.content.Policies, 'index']).as('policies.index')
router.get('/policies/:handle', [controllers.content.Policies, 'show']).as('policies.show')
router.get('/blog/:handle', [controllers.content.Blogs, 'show']).as('blogs.show')
router.get('/blog/:handle/:article', [controllers.content.Articles, 'show']).as('articles.show')
router.post('/store/cart', [controllers.Cart, 'store']).as('cart.add')
router.patch('/store/cart/:id', [controllers.Cart, 'update']).as('cart.update')
router.delete('/store/cart/:id', [controllers.Cart, 'destroy']).as('cart.remove')

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
    router.get('/dashboard', [controllers.Dashboard, 'index']).as('dashboard')
    router.get('/inbox', [controllers.Inbox, 'index']).as('inbox')
    router.get('/customers', [controllers.Customers, 'index']).as('customers')
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
