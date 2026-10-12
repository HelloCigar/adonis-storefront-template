import { OrderActivitySchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import { jsonColumn } from '#models/shared/json_column'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Activity extends compose(OrderActivitySchema, withUlidPrimaryKey()) {
  static table = 'order_activities'
  @column(jsonColumn) declare details: Record<string, string | number | null> | null
  @belongsTo(() => User, { foreignKey: 'actorId' }) declare actor: BelongsTo<typeof User>
}
