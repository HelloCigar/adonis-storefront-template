import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Sends a signed-in user whose email is not verified yet to the activation screen. */
export default class VerifiedAccountMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (auth.user && auth.user.hasInactiveAccount) {
      return response.redirect().toRoute('email_verifications.create')
    }

    return next()
  }
}
