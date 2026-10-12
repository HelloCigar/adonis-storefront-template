import { DiscountCodeSchema } from '#database/schema'
import DiscountRedemption from '#models/checkout/discount_redemption'
import User from '#models/account/user'
import { belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export type DiscountKind = 'percentage' | 'fixed'

export default class DiscountCode extends compose(DiscountCodeSchema, withUlidPrimaryKey()) {
  /** Codes are matched case-insensitively and stored upper case. */
  static normalize(code: string) {
    return code.trim().toUpperCase()
  }

  static byCode = scope((query, code: string) => {
    query.where('code', DiscountCode.normalize(code))
  })

  @column() declare kind: DiscountKind

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => DiscountRedemption, { foreignKey: 'discountCodeId' })
  declare redemptions: HasMany<typeof DiscountRedemption>
}
