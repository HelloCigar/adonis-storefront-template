import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/account/user'

export default class MakeAdmin extends BaseCommand {
  static commandName = 'user:make-admin'
  static description = 'Grant administrator access to an existing user account'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Email of the existing account' })
  declare email: string

  async run() {
    const user = await User.findBy('email', this.email)
    if (!user) {
      this.logger.error('No account found for that email')
      this.exitCode = 1
      return
    }
    await user.merge({ role: 'admin' }).save()
    this.logger.success(`Administrator access granted to ${user.email}`)
  }
}
