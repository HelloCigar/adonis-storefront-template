import type User from '#models/account/user'
import { appUrl } from '#config/app'
import { BaseMail } from '@adonisjs/mail'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { EmailVerificationToken } from '@adonisplus/persona/email'

export default class AccountActivationProvision extends BaseMail {
  subject = 'Confirm your email address'
  template = 'emails/account_activation'

  constructor(
    public user: User,
    public token: EmailVerificationToken
  ) {
    super()
  }

  prepare() {
    this.message.to(this.token.email).htmlView(this.template, {
      title: this.subject,
      verificationLink: urlFor('email_verifications.show', [this.token.value!.release()], {
        prefixUrl: appUrl,
      }),
    })
  }
}
