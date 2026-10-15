import { DateTime } from 'luxon'
import { AssistantConversationSchema } from '#database/schema'
import { belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import User from '#models/account/user'
import AssistantMessage from '#models/assistant/assistant_message'
import AssistantProposal from '#models/assistant/assistant_proposal'
import { sqlDateTime } from '#models/shared/sql_datetime'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import { assistantLimits } from '#values/assistant'

export default class AssistantConversation extends compose(
  AssistantConversationSchema,
  withUlidPrimaryKey()
) {
  /** One shopper's past conversations, most recently used first. */
  static ownedBy = scope((query, userId: string) => {
    query.where('user_id', userId).orderBy('last_message_at', 'desc').orderBy('id', 'desc')
  })

  /** Conversations whose last message is older than the retention period. */
  static expired = scope((query) => {
    const cutoff = DateTime.utc().minus({ days: assistantLimits.retentionDays })
    query.where('last_message_at', '<', sqlDateTime(cutoff))
  })

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => AssistantMessage, { foreignKey: 'conversationId' })
  declare messages: HasMany<typeof AssistantMessage>

  @hasMany(() => AssistantProposal, { foreignKey: 'conversationId' })
  declare proposals: HasMany<typeof AssistantProposal>

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
}
