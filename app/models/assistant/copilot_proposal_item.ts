import { CopilotProposalItemSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import CopilotProposal from '#models/assistant/copilot_proposal'
import { jsonColumn } from '#models/shared/json_column'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import type { CopilotRecordType } from '#values/assistant'

export default class CopilotProposalItem extends compose(
  CopilotProposalItemSchema,
  withUlidPrimaryKey()
) {
  @column()
  declare recordType: CopilotRecordType

  /** Raw values of only the changed fields; null for a create. */
  @column(jsonColumn)
  declare before: Record<string, unknown> | null

  @column(jsonColumn)
  declare after: Record<string, unknown>

  @belongsTo(() => CopilotProposal, { foreignKey: 'proposalId' })
  declare proposal: BelongsTo<typeof CopilotProposal>
}
