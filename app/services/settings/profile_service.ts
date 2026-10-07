import type User from '#models/account/user'
import type { Infer } from '@vinejs/vine/types'
import type { updateProfileValidator, updatePasswordValidator } from '#validators/settings/user'
import hash from '@adonisjs/core/services/hash'
import { errors } from '@vinejs/vine'
import { attachmentManager } from '@jrmc/adonis-attachment'

export default class ProfileService {
  async update(user: User, { avatar, fullName, email }: Infer<typeof updateProfileValidator>) {
    if (avatar) user.avatar.set(await attachmentManager.createFromFile(avatar))
    user.merge({ fullName, email })
    await user.save()
  }

  async removeAvatar(user: User) {
    user.avatar.detach()
    await user.save()
  }

  async updatePassword(
    user: User,
    { currentPassword, password }: Infer<typeof updatePasswordValidator>
  ) {
    if (!(await hash.verify(user.password, currentPassword))) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'currentPassword',
          rule: 'current_password',
          message: 'The current password is incorrect.',
        },
      ])
    }
    if (await hash.verify(user.password, password)) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'password',
          rule: 'new_password',
          message: 'Choose a password different from your current password.',
        },
      ])
    }
    user.password = password
    await user.save()
  }
}
