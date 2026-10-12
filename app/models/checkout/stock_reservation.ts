import { StockReservationSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ProductVariant from '#models/catalog/product_variant'
import type { ReservationState } from '#services/checkout/state_service'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class StockReservation extends compose(
  StockReservationSchema,
  withUlidPrimaryKey()
) {
  @column() declare state: ReservationState

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>
}
