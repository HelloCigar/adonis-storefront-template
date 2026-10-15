import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { errors } from '@vinejs/vine'
import type AssistantProposal from '#models/assistant/assistant_proposal'
import AssistantMessage from '#models/assistant/assistant_message'
import CartService from '#services/checkout/cart_service'
import { affectedRows } from '#models/shared/affected_rows'
import { sqlDateTime } from '#models/shared/sql_datetime'

/**
 * A shopper accepts an add-to-cart proposal. The proposal is claimed with one conditional update,
 * so two quick taps can never add twice, and the claim is undone when the cart refuses the add.
 * Needs `conversation` and `variant.product` preloaded.
 */
@inject()
export default class ProposalAcceptanceService {
  constructor(private carts: CartService) {}

  async accept(proposal: AssistantProposal, cartToken: string, userId: string | undefined) {
    const now = sqlDateTime()
    const claimed = await db
      .from('assistant_proposals')
      .where('id', proposal.id)
      .whereNull('added_at')
      .whereNull('dismissed_at')
      .where('expires_at', '>', now)
      // The price shown is always the price added.
      .whereExists((query) =>
        query
          .from('product_variants')
          .whereColumn('product_variants.id', 'assistant_proposals.product_variant_id')
          .whereColumn('product_variants.price_amount', 'assistant_proposals.unit_price_amount')
      )
      .update({ added_at: now })
    if (affectedRows(claimed) !== 1) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'proposal', rule: 'addable', message: 'No longer available — ask again' },
      ])
    }

    try {
      await this.carts.add(cartToken, userId, proposal.productVariantId, proposal.quantity)
    } catch (error) {
      await db.from('assistant_proposals').where('id', proposal.id).update({ added_at: null })
      throw error
    }

    await proposal.refresh()
    const cart = await this.carts.load(cartToken)
    const cartCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0
    const { variant } = proposal
    const message = await AssistantMessage.create({
      conversationId: proposal.conversationId,
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: `Added ${variant.product.title} (${variant.title}) × ${proposal.quantity} to your cart. Your cart now has ${cartCount} items.`,
        },
        { type: 'data-checkout', data: {} },
      ],
    })
    await proposal.conversation.touch()
    return { message, cartCount }
  }
}
