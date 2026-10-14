import { inject } from '@adonisjs/core'
import User from '#models/account/user'
import PasskeyTransformer from '#transformers/account/passkey_transformer'
import ProfileService from '#services/settings/profile_service'
import { updatePasswordValidator } from '#validators/settings/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SecurityController {
  constructor(private profileService: ProfileService) {}

  async show({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const passkeys = await User.passkeys.all(user)

    return inertia.render('settings/security', {
      passkeys: PasskeyTransformer.transform(passkeys),
    })
  }

  async update({ request, auth, response, session, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountUserPolicy').authorize('update', user)
    const data = await request.validateUsing(updatePasswordValidator)
    await this.profileService.updatePassword(user, data)
    session.flash('success', 'Your password has been updated.')
    return response.redirect().back('/settings/security')
  }
}
