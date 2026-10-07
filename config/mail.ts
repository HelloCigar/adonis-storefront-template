import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const username = env.get('SMTP_USERNAME')
const password = env.get('SMTP_PASSWORD')?.release()
/** One setting names the store as the sender and in the email wordmark. */
const storeName = env.get('MAIL_FROM_NAME', 'MediaBunny')

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER', 'smtp'),

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'store@example.com'),
    name: storeName,
  },

  /**
   * The globals are shared with all the templates rendered using the
   * configured template engine.
   */
  globals: {
    brandName: storeName,
  },

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'localhost'),
      port: env.get('SMTP_PORT', 1025),
      secure: env.get('SMTP_SECURE', false),
      connectionTimeout: 15_000,
      socketTimeout: 30_000,
      auth: username && password ? { type: 'login', user: username, pass: password } : undefined,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
