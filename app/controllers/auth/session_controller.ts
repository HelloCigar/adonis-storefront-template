import User from '#models/account/user'
import { loginValidator } from '#validators/auth/user'
import limiter from '@adonisjs/limiter/services/main'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const failedLogins = () =>
  limiter.use({ requests: 5, duration: '15 minutes', blockDuration: '15 minutes' })

export default class SessionController {
  async create({ inertia, request }: HttpContext) {
    return inertia.render('auth/login', {
      lastLoginMethod: request.plainCookie('last_login_method') ?? null,
    })
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const [throttled, user] = await failedLogins().penalize(`login_${email}_${request.ip()}`, () =>
      User.verifyCredentials(email, password)
    )
    if (throttled) {
      const minutes = Math.max(1, Math.ceil(throttled.response.availableIn / 60))
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'email',
          rule: 'throttle',
          message: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        },
      ])
    }

    await auth.use('web').login(user)
    session.flash('passkeySignals', await user.getPasskeySignals())
    response.plainCookie('last_login_method', 'email', { maxAge: '60 days' })
    response.redirect().toRoute(user.isStoreStaff ? 'dashboard' : 'account.show')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
