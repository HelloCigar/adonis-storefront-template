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
