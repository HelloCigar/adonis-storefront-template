import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  async toObject() {
    const avatar = await this.resource.avatar.get()

    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      avatarUrl: avatar
        ? `/attachments/${encodeURIComponent(avatar.attachmentId)}/${encodeURIComponent(avatar.attachment.name)}`
        : null,
    }
  }
}
