import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { attachment, type AttachmentRelation } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Cart from '#models/checkout/cart'
import CustomerAddress from '#models/account/customer_address'
import Order from '#models/checkout/order'

export const userRoles = ['customer', 'staff', 'admin'] as const
export type UserRole = (typeof userRoles)[number]

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  declare role: UserRole

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

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
