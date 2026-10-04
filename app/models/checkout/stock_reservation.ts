import { StockReservationSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { ReservationState } from '#services/checkout/state_service'

export default class StockReservation extends StockReservationSchema {
  @column() declare state: ReservationState
  @column({ consume: Number }) declare expiresAtMs: number
}
