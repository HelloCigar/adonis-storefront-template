import type User from '#models/account/user'
import { BaseMail } from '@adonisjs/mail'
import { storeEmail } from '#config/mail'
import StoreSetting from '#models/settings/store_setting'

export default class PasskeyChangedNotification extends BaseMail {
  declare subject: string

  constructor(
    public user: User,
    public event: 'added' | 'removed',
    public passkeyName: string
  ) {
    super()
    switch (event) {
      case 'added':
        this.subject = 'A passkey was added to your account'
        break
      case 'removed':
        this.subject = 'A passkey was removed from your account'
        break
    }
  }

  async prepare() {
    const settings = await StoreSetting.current()
    const view = {
      title: this.subject,
      // Overrides the mailer's deployment-wide brandName with the name the store saved.
      brandName: settings.effectiveStoreName,
      event: this.event,
      passkeyName: this.passkeyName,
    }
    this.message
      .from(storeEmail, settings.effectiveStoreName)
      .replyTo(settings.effectiveContactEmail)
      .to(this.user.email)
      .htmlView('emails/passkey_changed', view)
      .textView('emails/passkey_changed_text', view)
  }
}
