import type User from '#models/account/user'
import CustomerAddressTransformer from '#transformers/account/customer_address_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  async toObject() {
    const avatar = await this.resource.avatar.get()

    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'firstName',
        'lastName',
        'email',
        'role',
        'acceptsMarketing',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      avatarUrl: avatar
        ? `/attachments/${encodeURIComponent(avatar.attachmentId)}/${encodeURIComponent(avatar.attachment.name)}`
        : null,
      emailAddress: { emailAddress: this.resource.email },
      phone: this.resource.phoneNumber,
      phoneNumber: this.resource.phoneNumber ? { phoneNumber: this.resource.phoneNumber } : null,
      defaultAddress: CustomerAddressTransformer.transform(
        this.whenLoaded(this.resource.defaultAddress)
      ),
      addresses: CustomerAddressTransformer.transform(this.whenLoaded(this.resource.addresses)),
    }
  }
}
