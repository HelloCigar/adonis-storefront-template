import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  show({ inertia, auth }: HttpContext) {
    return inertia.render('account/profile', {
      cartRemindersEnabled: auth.getUserOrFail().receivesCartReminders,
    })
  }
}
