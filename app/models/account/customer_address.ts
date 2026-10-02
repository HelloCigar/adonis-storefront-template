import { CustomerAddressSchema } from '#database/schema'
import User from '#models/account/user'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CustomerAddress extends CustomerAddressSchema {
  // The database uses address1/address2, not Lucid's address_1/address_2 convention.
  @column({ columnName: 'address1' })
  declare address1: string

  @column({ columnName: 'address2' })
  declare address2: string | null

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}
