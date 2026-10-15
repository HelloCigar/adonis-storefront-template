import { BaseTransformer } from '@adonisjs/core/transformers'
import type AssistantProposal from '#models/assistant/assistant_proposal'
import checkout from '#config/checkout'
import { mediaUrl } from '#transformers/shared/media_transformer'

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: checkout.currency })

/**
 * What an add-to-cart proposal will add, at the price it was made with. Needs `variant.product`
 * preloaded; the product's first image is read from its media.
 */
export default class AssistantProposalTransformer extends BaseTransformer<AssistantProposal> {
  async toObject() {
    const variant = this.resource.variant
    const product = variant.product
    const media = await product.media.all()
    const image = media.find((item) => item.attachment.mimeType.startsWith('image/'))
    const linePrice = Number(this.resource.unitPriceAmount) * this.resource.quantity

    return {
      ...this.pick(this.resource, ['id', 'quantity']),
      state: this.resource.state(),
      product: {
        title: product.title,
        handle: product.handle,
        image: image ? mediaUrl(image) : null,
      },
      variantTitle: variant.title,
      linePrice: { raw: linePrice, formatted: currency.format(linePrice) },
    }
  }
}
