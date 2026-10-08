import { column } from '@adonisjs/lucid/orm'
import { RefundObservationSchema } from '#database/schema'

export default class RefundObservation extends RefundObservationSchema {
  @column() declare state: 'pending' | 'succeeded' | 'failed'
}
