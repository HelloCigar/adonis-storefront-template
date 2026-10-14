import User from '#models/account/user'
import PasskeyTransformer from '#transformers/account/passkey_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class SecurityController {
  async show({ auth, inertia }: HttpContext) {
    const passkeys = await User.passkeys.all(auth.getUserOrFail())

    return inertia.render('account/security', {
      passkeys: PasskeyTransformer.transform(passkeys),
    })
  }
}
