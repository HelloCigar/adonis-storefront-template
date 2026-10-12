import { getActiveTestOrFail } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import type { MailTransportContract } from '@adonisjs/mail/types'

/**
 * Makes the SMTP server refuse every message until the active test ends, so delivery fails
 * the way it does when the mail server is down. `mail.fake()` cannot fail, so tests that
 * need a failed delivery use this, then `mail.fake()` once delivery should succeed.
 */
export async function failMailDelivery() {
  const test = getActiveTestOrFail()
  const name = mail.config.default!
  const mailers = mail.config.mailers as Record<string, () => MailTransportContract>
  const factory = mailers[name]
  const refusing: MailTransportContract = {
    async send() {
      throw new Error('SMTP unavailable')
    },
  }
  await mail.close(name)
  mailers[name] = () => refusing
  const restore = async () => {
    if (mailers[name] === factory) return
    mailers[name] = factory
    await mail.close(name)
  }
  test.cleanup(restore)
  return { restore }
}
