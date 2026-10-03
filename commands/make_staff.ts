import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/account/user'

export default class MakeStaff extends BaseCommand {
  static commandName = 'user:make-staff'
  static description = 'Grant store staff access to an existing user account'
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
    if (user.role === 'admin') {
      this.logger.success('This administrator already has store staff access')
      return
    }
    await user.merge({ role: 'staff' }).save()
    this.logger.success(`Staff access granted to ${user.email}`)
  }
}
