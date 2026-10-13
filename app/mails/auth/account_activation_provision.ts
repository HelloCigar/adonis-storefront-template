import type User from '#models/account/user'
import { appUrl } from '#config/app'
import { BaseMail } from '@adonisjs/mail'
import { storeEmail } from '#config/mail'
import StoreSetting from '#models/settings/store_setting'
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

  async prepare() {
    const settings = await StoreSetting.current()
    const view = {
      title: this.subject,
      // Overrides the mailer's deployment-wide brandName with the name the store saved.
      brandName: settings.effectiveStoreName,
      verificationLink: urlFor('email_verifications.show', [this.token.value!.release()], {
        prefixUrl: appUrl,
      }),
    }
    this.message
      .from(storeEmail, settings.effectiveStoreName)
      .replyTo(settings.effectiveContactEmail)
      .to(this.token.email)
      .htmlView(this.template, view)
      .textView(`${this.template}_text`, view)
  }
}
