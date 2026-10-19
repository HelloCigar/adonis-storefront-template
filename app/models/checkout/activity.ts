import { OrderActivitySchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import CopilotProposal from '#models/assistant/copilot_proposal'
import { jsonColumn } from '#models/shared/json_column'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Activity extends compose(OrderActivitySchema, withUlidPrimaryKey()) {
  static table = 'order_activities'
  @column(jsonColumn) declare details: Record<string, string | number | null> | null
  @belongsTo(() => User, { foreignKey: 'actorId' }) declare actor: BelongsTo<typeof User>
  /** Set when the change was applied from a copilot proposal; links admins to the conversation. */
  @belongsTo(() => CopilotProposal, { foreignKey: 'copilotProposalId' })
  declare copilotProposal: BelongsTo<typeof CopilotProposal>
}
