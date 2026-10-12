import User from '#models/account/user'
import type { HttpContext } from '@adonisjs/core/http'
import { passkeyAuthenticationValidator } from '#validators/auth/user'

export default class PasskeySessionController {
  async store({ auth, request, response, session }: HttpContext) {
    const payload = await request.validateUsing(passkeyAuthenticationValidator)
    const user = await User.verifyPasskeyLogin(payload.response)

    await auth.use('web').login(user)
    session.flash('passkeySignals', await user.getPasskeySignals())
    response.plainCookie('last_login_method', 'passkey', { maxAge: '60 days' })

    response.redirect().toRoute(user.isStoreStaff ? 'dashboard' : 'account.show')
  }
}
