import User from '#models/account/user'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { passwordPolicy } from '#validators/shared/password_policy'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth/user'
import PasswordResetProvision from '#mails/auth/password_reset_provision'

export default class PasswordResetsController {
  create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async store({ session, request, response }: HttpContext) {
    const payload = await request.validateUsing(forgotPasswordValidator)
    const user = await User.findBy('email', payload.email)

    if (user) {
      const token = await user.createPasswordResetToken(true, '1 minute')
      if (token) {
        await mail.sendLater(new PasswordResetProvision(user, token))
      }
    }

    session.flash('success', 'We have sent you the instructions to reset your password')
    response.redirect().back()
  }

  show({ inertia, params }: HttpContext) {
    return inertia.render('auth/reset_password', { token: params.token, passwordPolicy })
  }

  async update({ response, session, request }: HttpContext) {
    const payload = await request.validateUsing(resetPasswordValidator)
    const user = await User.resetPassword(request.param('token'), payload.password)
    await user.clearPasswordResetTokens()

    session.flash('success', 'Password reset completed. You can login now')
    response.redirect().toRoute('session.create')
  }
}
