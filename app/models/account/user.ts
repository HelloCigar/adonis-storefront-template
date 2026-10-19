import env from '#start/env'
import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { withManagedEmail } from '@adonisplus/persona/email'
import { withManagedPassword } from '@adonisplus/persona/password'
import { DbPasskeysProvider, withPasskeyManagement } from '@adonisplus/persona/passkeys'
import { attachment, type AttachmentRelation } from '@jrmc/adonis-attachment/lucid'
import { beforeSave, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Cart from '#models/checkout/cart'
import CustomerAddress from '#models/account/customer_address'
import Order from '#models/checkout/order'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export const userRoles = ['customer', 'staff', 'admin'] as const
export type UserRole = (typeof userRoles)[number]

export default class User extends compose(
  UserSchema,
  withAuthFinder(hash),
  withManagedEmail(),
  withManagedPassword(),
  withPasskeyManagement({
    rpName: env.get('MAIL_FROM_NAME', 'MediaBunny'),
    rpId: env.get('PASSKEY_RP_ID'),
    origins: env.get('PASSKEY_ORIGINS').split(','),
  }),
  withUlidPrimaryKey()
) {
  static passkeys = DbPasskeysProvider.forModel(User)

  declare role: UserRole

  /** Email lookups are exact, so every write path stores the canonical form. */
  @beforeSave()
  static normalizeEmail(user: User) {
    if (user.$dirty.email) user.email = user.email.trim().toLowerCase()
  }

  getPasskeyUserDetails() {
    return { name: this.email, displayName: this.fullName ?? this.email }
  }

  /** Customers get cart reminders until they opt out. */
  get receivesCartReminders() {
    return this.cartRemindersOptedOutAt === null
  }

  get isStoreStaff() {
    return this.role === 'staff' || this.role === 'admin'
  }

  @attachment({ folder: 'avatars' })
  declare avatar: AttachmentRelation

  @hasMany(() => CustomerAddress, { foreignKey: 'userId' })
  declare addresses: HasMany<typeof CustomerAddress>

  @belongsTo(() => CustomerAddress, { foreignKey: 'defaultAddressId' })
  declare defaultAddress: BelongsTo<typeof CustomerAddress>

  @hasMany(() => Cart, { foreignKey: 'userId' })
  declare carts: HasMany<typeof Cart>

  @hasMany(() => Order, { foreignKey: 'userId' })
  declare orders: HasMany<typeof Order>

  @hasMany(() => AssistantConversation, { foreignKey: 'userId' })
  declare assistantConversations: HasMany<typeof AssistantConversation>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
