import { column } from '@adonisjs/lucid/orm'
import { RefundObservationSchema } from '#database/schema'

export default class RefundObservation extends RefundObservationSchema {
  @column({ consume: Boolean }) declare liveMode: boolean
  @column({ consume: Number }) declare amountMinor: number
  @column() declare state: 'pending' | 'succeeded' | 'failed'
}
