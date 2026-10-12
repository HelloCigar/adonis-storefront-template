import User from '#models/account/user'
import mail from '@adonisjs/mail/services/main'
import { signupValidator } from '#validators/auth/user'
import type { HttpContext } from '@adonisjs/core/http'
import { passwordPolicy } from '#validators/shared/password_policy'
import AccountActivationProvision from '#mails/auth/account_activation_provision'

export default class NewAccountController {
  async create({ inertia, request }: HttpContext) {
    return inertia.render('auth/signup', {
      passwordPolicy,
      lastLoginMethod: request.plainCookie('last_login_method') ?? null,
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const { user, token } = await User.transaction(async (trx) => {
      const newUser = await User.create(
        { fullName, email, password, unverifiedEmail: email },
        { client: trx }
      )
      const verificationToken = await newUser.createEmailVerificationToken()
      return { user: newUser, token: verificationToken }
    })

    await mail.sendLater(new AccountActivationProvision(user, token))

    await auth.use('web').login(user)
    response.plainCookie('last_login_method', 'email', { maxAge: '60 days' })

    response.redirect().toRoute('email_verifications.create')
  }
}
