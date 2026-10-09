import { OrderAddressSchema } from '#database/schema'
import Order from '#models/checkout/order'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrderAddress extends OrderAddressSchema {
  @column({ columnName: 'address1' })
  declare address1: string

  @column({ columnName: 'address2' })
  declare address2: string | null

  /** Postal lines for emails and invoices, with the country spelled out. */
  get displayLines() {
    const region = new Intl.DisplayNames(['en'], { type: 'region' })
    return [
      [this.firstName, this.lastName].filter(Boolean).join(' '),
      this.company,
      this.address1,
      this.address2,
      [this.city, this.zoneCode, this.postalCode].filter(Boolean).join(', '),
      region.of(this.countryCode) ?? this.countryCode,
    ].filter((line): line is string => Boolean(line))
  }

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>
}
