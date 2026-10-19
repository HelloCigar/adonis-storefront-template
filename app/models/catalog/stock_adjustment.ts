import { StockAdjustmentSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import CopilotProposal from '#models/assistant/copilot_proposal'
import ProductVariant from '#models/catalog/product_variant'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

/** Reasons staff choose when adjusting stock by hand. */
export const manualStockReasons = [
  'received',
  'returned',
  'count',
  'damaged',
  'lost',
  'correction',
] as const
/** Reasons recorded when the variant form creates stock or changes it directly. */
export const variantFormStockReasons = ['initial', 'edited'] as const
export type StockAdjustmentReason =
  (typeof manualStockReasons)[number] | (typeof variantFormStockReasons)[number]

export default class StockAdjustment extends compose(StockAdjustmentSchema, withUlidPrimaryKey()) {
  @column() declare reason: StockAdjustmentReason

  get change() {
    return this.quantityBefore === null || this.quantityAfter === null
      ? null
      : this.quantityAfter - this.quantityBefore
  }

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>

  @belongsTo(() => User, { foreignKey: 'actorId' }) declare actor: BelongsTo<typeof User>

  /** Set when the change was applied from a copilot proposal; links admins to the conversation. */
  @belongsTo(() => CopilotProposal, { foreignKey: 'copilotProposalId' })
  declare copilotProposal: BelongsTo<typeof CopilotProposal>
}
