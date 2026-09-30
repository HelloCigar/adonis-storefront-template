import type { HttpContext } from '@adonisjs/core/http'

export default class NotificationsController {
  index({ inertia }: HttpContext) {
    return inertia.render('settings/notifications', {})
  }
}
