import { OrderActivitySchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import { jsonColumn } from '#models/shared/json_column'

export default class Activity extends OrderActivitySchema {
  static table = 'order_activities'
  @column(jsonColumn) declare details: Record<string, string | number | null> | null
}
