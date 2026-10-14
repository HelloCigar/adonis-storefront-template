import type User from '#models/account/user'
import type { Infer } from '@vinejs/vine/types'
import type { updateProfileValidator, updatePasswordValidator } from '#validators/settings/user'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import { errors } from '@vinejs/vine'
import { attachmentManager } from '@jrmc/adonis-attachment'

export default class ProfileService {
  /**
   * A changed email stays unverified until confirmed, so the current one keeps signing in.
   * Returns the verification token to mail when the email changed.
   */
  async update(user: User, { avatar, fullName, email }: Infer<typeof updateProfileValidator>) {
    const attachment = avatar ? await attachmentManager.createFromFile(avatar) : null
    const emailChanged = await db.transaction(async (trx) => {
      // Re-read inside the transaction so a concurrent update cannot double-send verification.
      user.useTransaction(trx)
      await user.refresh()
      if (attachment) user.avatar.set(attachment)
      user.fullName = fullName

      const changed = user.hasEmailChanged(email)
      if (changed && user.hasEmailReverted(email)) {
        user.unverifiedEmail = null
      } else if (changed) {
        user.withEmail(email)
      }
      await user.save()
      return changed && !!user.unverifiedEmail
    })

    return emailChanged ? user.createEmailVerificationToken() : null
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
