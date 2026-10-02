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
    await bouncer.with('AccountUserPolicy').authorize('update', auth.getUserOrFail())
    const data = await request.validateUsing(updatePasswordValidator)
    const errors = await this.profileService.updatePassword(auth.getUserOrFail(), data)
    if (errors) {
      session.flash('inputErrorsBag', errors)
      return response.redirect().back()
    }
    session.flash('success', 'Your password has been updated.')
    return response.redirect().toRoute('settings.security')
  }
}
