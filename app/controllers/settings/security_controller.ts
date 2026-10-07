import { inject } from '@adonisjs/core'
import ProfileService from '#services/settings/profile_service'
import { updatePasswordValidator } from '#validators/settings/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SecurityController {
  constructor(private profileService: ProfileService) {}

  show({ inertia }: HttpContext) {
    return inertia.render('settings/security', {})
  }

  async update({ request, auth, response, session, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountUserPolicy').authorize('update', user)
    const data = await request.validateUsing(updatePasswordValidator)
    await this.profileService.updatePassword(user, data)
    session.flash('success', 'Your password has been updated.')
    return response.redirect().toRoute('settings.security')
  }
}
