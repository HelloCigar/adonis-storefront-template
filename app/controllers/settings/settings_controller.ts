import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import EmailChangeProvision from '#mails/auth/email_change_provision'
import AccountActivationProvision from '#mails/auth/account_activation_provision'
import ProfileService from '#services/settings/profile_service'
import { updateProfileValidator } from '#validators/settings/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SettingsController {
  constructor(private profileService: ProfileService) {}

  index({ inertia }: HttpContext) {
    return inertia.render('settings/index', {})
  }

  async update({ request, auth, response, session, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountUserPolicy').authorize('update', user)
    const data = await request.validateUsing(updateProfileValidator, { meta: { userId: user.id } })
    const token = await this.profileService.update(user, data)
    if (token) {
      await mail.sendLater(
        user.hasInactiveAccount
          ? new AccountActivationProvision(user, token)
          : new EmailChangeProvision(user, token)
      )
    }
    session.flash('success', 'Your profile has been updated.')
    return response.redirect().toRoute('settings')
  }
}
