import { DateTime } from 'luxon'
import { CopilotProposalSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { compose } from '@adonisjs/core/helpers'
import { errors } from '@vinejs/vine'
import AssistantConversation from '#models/assistant/assistant_conversation'
import CopilotProposalItem from '#models/assistant/copilot_proposal_item'
import Activity from '#models/checkout/activity'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import type { CopilotAction, ProposalOutcome } from '#values/assistant'

export default class CopilotProposal extends compose(CopilotProposalSchema, withUlidPrimaryKey()) {
  @column()
  declare action: CopilotAction

  @belongsTo(() => AssistantConversation, { foreignKey: 'conversationId' })
  declare conversation: BelongsTo<typeof AssistantConversation>

  /** Always preloaded ordered by `position`. */
  @hasMany(() => CopilotProposalItem, { foreignKey: 'proposalId' })
  declare items: HasMany<typeof CopilotProposalItem>

  @hasMany(() => Activity, { foreignKey: 'copilotProposalId' })
  declare orderActivities: HasMany<typeof Activity>

  /** At most one of the outcome timestamps is ever set; none set and past expiry is expired. */
  outcome(now = DateTime.now()): ProposalOutcome {
    if (this.appliedAt) return 'applied'
    if (this.dismissedAt) return 'dismissed'
    if (this.refusedAt) return 'refused'
    if (now > this.expiresAt) return 'expired'
    return 'pending'
  }

  async markDismissed() {
    if (this.outcome() !== 'pending') throw staleProposal()
    this.dismissedAt = DateTime.now()
    await this.save()
  }

  /**
   * Records the message the person saw when Apply was refused. Called outside the rolled-back
   * apply transaction, so the refusal outlives the rollback it describes.
   */
  async markRefused(message: string, client?: TransactionClientContract) {
    if (client) this.useTransaction(client)
    this.refusedAt = DateTime.now()
    this.refusal = message.slice(0, 300)
    await this.save()
  }
}

function staleProposal() {
  return new errors.E_VALIDATION_ERROR([
    {
      field: 'proposal',
      rule: 'pending',
      message: 'This changed since it was proposed — ask again',
    },
  ])
}
