import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  show({ inertia }: HttpContext) {
    return inertia.render('account/profile', {})
  }
}
