import { BaseSchema } from '@adonisjs/lucid/schema'
import app from '@adonisjs/core/services/app'
import { attachmentManager } from '@jrmc/adonis-attachment'
import User from '#models/account/user'
import { relative, resolve, sep } from 'node:path'

export async function backfillUserAvatars(storageRoot = app.makePath('storage')) {
  const users = await User.query().whereNotNull('avatarPath')

  for (const user of users) {
    if (!user.avatarPath || (await user.avatar.get())) continue

    const source = resolve(storageRoot, user.avatarPath)
    const pathFromRoot = relative(storageRoot, source)
    if (!pathFromRoot || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
      throw new Error(`Invalid legacy avatar path for user ${user.id}`)
    }

    user.avatar.set(await attachmentManager.createFromPath(source))
    await user.save()
  }
}

export default class extends BaseSchema {
  static disableTransactions = true

  async up() {
    await backfillUserAvatars()
  }

  async down() {
    // Keep backfilled avatars and legacy paths intact on rollback.
  }
}
