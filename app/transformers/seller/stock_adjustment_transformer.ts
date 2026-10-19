import { BaseTransformer } from '@adonisjs/core/transformers'
import type StockAdjustment from '#models/catalog/stock_adjustment'

export default class SellerStockAdjustmentTransformer extends BaseTransformer<StockAdjustment> {
  toObject() {
    const actor = this.resource.actor
    return {
      ...this.pick(this.resource, [
        'id',
        'reason',
        'quantityBefore',
        'quantityAfter',
        'change',
        'note',
        'createdAt',
      ]),
      actorName: actor ? actor.fullName || actor.email : null,
      viaCopilot: this.resource.viaCopilot,
      copilotConversationId: this.resource.copilotProposal?.conversationId ?? null,
    }
  }
}
