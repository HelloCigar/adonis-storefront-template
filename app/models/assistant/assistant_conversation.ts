import { DateTime } from 'luxon'
import { AssistantConversationSchema } from '#database/schema'
import { belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { compose } from '@adonisjs/core/helpers'
import User from '#models/account/user'
import AssistantMessage from '#models/assistant/assistant_message'
import AssistantProposal from '#models/assistant/assistant_proposal'
import CopilotProposal from '#models/assistant/copilot_proposal'
import { sqlDateTime } from '#models/shared/sql_datetime'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import { assistantLimits, type AssistantKind } from '#values/assistant'

/** The admin review list's filters, as the review controller validates them. */
type ReviewFilters = {
  assistant?: AssistantKind
  userId?: string
  from?: DateTime
  to?: DateTime
  changesApplied?: boolean
  unanswered?: boolean
}

export default class AssistantConversation extends compose(
  AssistantConversationSchema,
  withUlidPrimaryKey()
) {
  @column()
  declare assistant: AssistantKind

  /** One shopper's past conversations, most recently used first. */
  static ownedBy = scope((query, userId: string) => {
    query.where('user_id', userId).orderBy('last_message_at', 'desc').orderBy('id', 'desc')
  })

  /** Only one assistant's conversations; the shopping and copilot paths never see each other's. */
  static ofAssistant = scope((query, kind: AssistantKind) => {
    query.where('assistant', kind)
  })

  /** Conversations whose last message is older than the retention period. */
  static expired = scope((query) => {
    const cutoff = DateTime.utc().minus({ days: assistantLimits.retentionDays })
    query.where('last_message_at', '<', sqlDateTime(cutoff))
  })

  /** Both assistants' conversations for admin review, newest first, narrowed by the filters. */
  static forReview = scope<
    typeof AssistantConversation,
    (query: ModelQueryBuilderContract<typeof AssistantConversation>, filters: ReviewFilters) => void
  >((query, filters) => {
    if (filters.assistant) query.where('assistant', filters.assistant)
    if (filters.userId) query.where('user_id', filters.userId)
    if (filters.from) query.where('last_message_at', '>=', sqlDateTime(filters.from.startOf('day')))
    if (filters.to) query.where('last_message_at', '<=', sqlDateTime(filters.to.endOf('day')))
    if (filters.changesApplied)
      query.whereHas('copilotProposals', (proposals) => proposals.whereNotNull('applied_at'))
    if (filters.unanswered) query.whereNotNull('last_unanswered_at')
    query
      .withCount('copilotProposals', (proposals) =>
        proposals.whereNotNull('applied_at').as('applied_proposals_count')
      )
      .orderBy('last_message_at', 'desc')
      .orderBy('id', 'desc')
  })

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => AssistantMessage, { foreignKey: 'conversationId' })
  declare messages: HasMany<typeof AssistantMessage>

  @hasMany(() => AssistantProposal, { foreignKey: 'conversationId' })
  declare proposals: HasMany<typeof AssistantProposal>

  @hasMany(() => CopilotProposal, { foreignKey: 'conversationId' })
  declare copilotProposals: HasMany<typeof CopilotProposal>

  /** Ownerless conversations are open to whoever holds them; owned ones only to their owner. */
  isOwnedBy(userId: string | undefined) {
    return this.userId === null || this.userId === userId
  }

  /** Gives a signed-out visitor's conversation to the shopper who just signed in, once. */
  async claimFor(user: User) {
    if (this.userId !== null) return
    this.userId = user.id
    await this.save()
  }

  /** Records a new message, titling the conversation after the shopper's first one. */
  async touch(firstText?: string) {
    this.lastMessageAt = DateTime.now()
    const title = firstText?.trim()
    if (!this.title && title) this.title = title.slice(0, 80)
    await this.save()
  }

  /** The assistant said it couldn't answer; admins can filter for these. */
  async markUnanswered() {
    this.lastUnansweredAt = DateTime.now()
    await this.save()
  }
}
