import { inject } from '@adonisjs/core'
import ProfileService from '#services/settings/profile_service'
import { updateProfileValidator } from '#validators/settings/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SettingsController {
  constructor(private profileService: ProfileService) {}

  index({ inertia }: HttpContext) {
    return inertia.render('settings/index', {})
  }

  async update({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator, { meta: { userId: user.id } })
    await this.profileService.update(user, data)
    session.flash('success', 'Your profile has been updated.')
    return response.redirect().toRoute('settings')
  }
}
