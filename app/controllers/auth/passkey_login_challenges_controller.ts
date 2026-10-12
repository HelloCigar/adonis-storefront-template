import User from '#models/account/user'
import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'

export default class PasskeyLoginChallengesController {
  async store({ request }: HttpContext) {
    await limiter
      .use({ requests: 10, duration: '1 minute' })
      .consume(`passkey_login_challenges_${request.ip()}`)

    await User.passkeys.clearExpiredChallenges()
    return User.createChallengeForLogin()
  }
}
