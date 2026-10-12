import User from '#models/account/user'
import { errors } from '@adonisjs/lucid'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import PasskeyChangedNotification from '#mails/auth/passkey_changed_notification'
import { passkeyNameValidator, passkeyRegistrationValidator } from '#validators/auth/user'

export default class PasskeysController {
  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(passkeyRegistrationValidator)

    const passkey = await user.registerPasskey(payload.response)
    await mail.sendLater(new PasskeyChangedNotification(user, 'added', passkey.name))

    session.flash('success', 'Passkey added')
    response.redirect().back()
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name } = await request.validateUsing(passkeyNameValidator)

    if (!(await User.passkeys.rename(user, params.id, name))) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    session.flash('success', 'Passkey renamed')
    response.redirect().back()
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const passkey = await User.passkeys.findById(user, params.id)
    if (!passkey) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    if (!(await User.passkeys.delete(user, passkey.identifier))) {
      throw new errors.E_ROW_NOT_FOUND()
    }

    await mail.sendLater(new PasskeyChangedNotification(user, 'removed', passkey.name))

    session.flash('success', 'Passkey removed')
    response.redirect().back()
  }
}
