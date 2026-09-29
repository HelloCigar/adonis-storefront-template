import type { HttpContext } from '@adonisjs/core/http'

export default class InboxController {
  index({ inertia }: HttpContext) {
    return inertia.render('inbox', {})
  }
}
