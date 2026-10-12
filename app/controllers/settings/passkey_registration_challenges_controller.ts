import User from '#models/account/user'
import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'

export default class PasskeyRegistrationChallengesController {
  async store({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    await limiter
      .use({ requests: 10, duration: '1 minute' })
      .consume(`passkey_registration_challenges_${user.id}`)

    await User.passkeys.clearExpiredChallenges()
    return user.createChallengeForRegistration()
  }
}
