import { StockReservationSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ProductVariant from '#models/catalog/product_variant'
import type { ReservationState } from '#services/checkout/state_service'

export default class StockReservation extends StockReservationSchema {
  @column() declare state: ReservationState
  @column({ consume: Number }) declare expiresAtMs: number

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>
}
