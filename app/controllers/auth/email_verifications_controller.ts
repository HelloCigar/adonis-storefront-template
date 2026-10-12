import User from '#models/account/user'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import AccountActivationProvision from '#mails/auth/account_activation_provision'

export default class EmailVerificationsController {
  create({ inertia }: HttpContext) {
    return inertia.render('account/activate', {})
  }

  async store({ session, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const token = await user.createEmailVerificationToken(true, '1 minute')

    if (token) {
      await mail.sendLater(new AccountActivationProvision(user, token))
    }

    session.flash('success', 'We sent you instructions to verify your email address')
    return response.redirect().back()
  }

  show({ inertia, params }: HttpContext) {
    return inertia.render('auth/verify_email', { token: params.token })
  }

  async update({ params, session, response, auth }: HttpContext) {
    const user = await User.verifyEmail(params.token, { redirectTo: '/login' })
    await user.clearEmailVerificationTokens()

    session.flash('success', 'Email verified')

    if (auth.user) {
      return response.redirect().toRoute(auth.user.isStoreStaff ? 'dashboard' : 'account.show')
    }
    response.redirect().toRoute('session.create')
  }
}
