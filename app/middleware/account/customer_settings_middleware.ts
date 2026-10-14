import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Sends customers from the store team's settings pages to the matching account page. */
export default class CustomerSettingsMiddleware {
  async handle(
    { auth, response }: HttpContext,
    next: NextFn,
    options: { redirectTo: 'account.profile.show' | 'account.security.show' }
  ) {
    if (auth.user && !auth.user.isStoreStaff) {
      return response.redirect().toRoute(options.redirectTo)
    }

    return next()
  }
}
