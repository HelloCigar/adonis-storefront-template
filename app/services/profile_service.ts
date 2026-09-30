import type User from '#models/user'
import type { Infer } from '@vinejs/vine/types'
import type { updateProfileValidator, updatePasswordValidator } from '#validators/user'
import hash from '@adonisjs/core/services/hash'
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
      return { currentPassword: ['The current password is incorrect.'] }
    }
    if (await hash.verify(user.password, password)) {
      return { password: ['Choose a password different from your current password.'] }
    }
    user.password = password
    await user.save()
    return null
  }
}
