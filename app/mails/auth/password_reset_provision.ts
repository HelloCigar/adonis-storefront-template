import type User from '#models/account/user'
import { appUrl } from '#config/app'
import { BaseMail } from '@adonisjs/mail'
import { storeEmail } from '#config/mail'
import StoreSetting from '#models/settings/store_setting'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { PasswordResetToken } from '@adonisplus/persona/password'

export default class PasswordResetProvision extends BaseMail {
  subject = 'Reset your account password'
  template = 'emails/reset_password'

  constructor(
    public user: User,
    public token: PasswordResetToken
  ) {
    super()
  }

  async prepare() {
    const settings = await StoreSetting.current()
    this.message
      .from(storeEmail, settings.effectiveStoreName)
      .replyTo(settings.effectiveContactEmail)
      .to(this.user.email)
      .htmlView(this.template, {
        title: this.subject,
        // Overrides the mailer's deployment-wide brandName with the name the store saved.
        brandName: settings.effectiveStoreName,
        passwordResetLink: urlFor('password_resets.show', [this.token.value!.release()], {
          prefixUrl: appUrl,
        }),
      })
  }
}
