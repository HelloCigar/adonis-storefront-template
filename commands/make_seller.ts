import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/account/user'

export default class MakeSeller extends BaseCommand {
  static commandName = 'user:make-seller'
  static description = 'Grant seller access to an existing user account'
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
    await user.merge({ role: 'seller' }).save()
    this.logger.success(`Seller access granted to ${user.email}`)
  }
}
