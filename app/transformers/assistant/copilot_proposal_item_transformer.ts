import { BaseTransformer } from '@adonisjs/core/transformers'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type CopilotProposalItem from '#models/assistant/copilot_proposal_item'
import ProductVariant from '#models/catalog/product_variant'
import { copilotField } from '#assistant/copilot_actions'
import type { CopilotAction } from '#values/assistant'

/**
 * One record a copilot proposal changes: a link to its dashboard page and each changed field as
 * before → after, labelled and formatted from the action registry's field catalog.
 */
export default class CopilotProposalItemTransformer extends BaseTransformer<CopilotProposalItem> {
  #action: CopilotAction

  constructor(resource: CopilotProposalItem, action: CopilotAction) {
    super(resource)
    this.#action = action
  }

  async toObject() {
    const { before, after } = this.resource
    return {
      ...this.pick(this.resource, ['id', 'recordType', 'recordId', 'recordLabel']),
      url: await this.url(),
      changes: Object.entries(after).map(([field, value]) => {
        const { label, format } = copilotField(this.#action, field)
        return {
          field,
          label,
          before: before ? { raw: before[field] ?? null, formatted: format(before[field]) } : null,
          after: { raw: value, formatted: format(value) },
        }
      }),
    }
  }

  /** The record's dashboard page; null for a create that hasn't been applied. */
  private async url() {
    const id = this.resource.recordId
    if (!id) return null
    switch (this.resource.recordType) {
      case 'product':
        return urlFor('seller.products.show', { id })
      case 'variant': {
        // Variants are edited on their product's page.
        const variant = await ProductVariant.find(id)
        return variant ? urlFor('seller.products.show', { id: variant.productId }) : null
      }
      case 'order':
        return urlFor('seller.orders.show', { id })
      case 'collection':
        return urlFor('seller.collections.index')
      case 'discount':
        return urlFor('seller.discounts.index')
      case 'review':
        return urlFor('seller.reviews.index')
      case 'post':
        return urlFor('seller.posts.edit', { id })
    }
  }
}
