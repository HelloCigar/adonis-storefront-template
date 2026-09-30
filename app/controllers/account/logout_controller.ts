import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutController {
  show({ inertia }: HttpContext) {
    return inertia.render('account/logout', {})
  }
}
