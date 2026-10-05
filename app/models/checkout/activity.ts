import { OrderActivitySchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import { jsonColumn } from '#models/shared/json_column'

export default class Activity extends OrderActivitySchema {
  static table = 'order_activities'
  @column(jsonColumn) declare details: Record<string, string | number | null> | null
  @belongsTo(() => User, { foreignKey: 'actorId' }) declare actor: BelongsTo<typeof User>
}
