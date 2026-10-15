import { DateTime } from 'luxon'
import { AssistantProposalSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { errors } from '@vinejs/vine'
import AssistantConversation from '#models/assistant/assistant_conversation'
import ProductVariant from '#models/catalog/product_variant'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import type { ProposalState } from '#values/assistant'

export default class AssistantProposal extends compose(
  AssistantProposalSchema,
  withUlidPrimaryKey()
) {
  @belongsTo(() => AssistantConversation, { foreignKey: 'conversationId' })
  declare conversation: BelongsTo<typeof AssistantConversation>

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>

  /** Needs `variant` preloaded: a changed price makes the proposal no longer available. */
  state(now = DateTime.now()): ProposalState {
    if (this.addedAt) return 'added'
    if (this.dismissedAt) return 'dismissed'
    if (now > this.expiresAt) return 'expired'
    if (Number(this.variant.priceAmount) !== Number(this.unitPriceAmount)) return 'expired'
    return 'addable'
  }

  async markAdded() {
    this.assertAddable()
    this.addedAt = DateTime.now()
    await this.save()
  }

  async markDismissed() {
    this.assertAddable()
    this.dismissedAt = DateTime.now()
    await this.save()
  }

  /** Only one of `added_at` and `dismissed_at` is ever set. */
  private assertAddable() {
    if (this.state() !== 'addable') {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'proposal', rule: 'addable', message: 'No longer available — ask again' },
      ])
    }
  }
}
