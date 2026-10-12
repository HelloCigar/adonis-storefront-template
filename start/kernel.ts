/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#exceptions/handler'))

server.use([
  () => import('#middleware/http/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('#middleware/http/inertia_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('#middleware/checkout/checkout_session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/auth/silent_auth_middleware'),
  () => import('#middleware/initialize_bouncer_middleware'),
])

export const middleware = router.named({
  guest: () => import('#middleware/auth/guest_middleware'),
  auth: () => import('#middleware/auth/auth_middleware'),
  staff: () => import('#middleware/staff/staff_middleware'),
  verifiedAccount: () => import('#middleware/auth/verified_account_middleware'),
})
