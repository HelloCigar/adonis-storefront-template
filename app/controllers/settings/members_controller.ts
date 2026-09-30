import type { HttpContext } from '@adonisjs/core/http'

export default class MembersController {
  index({ inertia }: HttpContext) {
    return inertia.render('settings/members', {})
  }
}
