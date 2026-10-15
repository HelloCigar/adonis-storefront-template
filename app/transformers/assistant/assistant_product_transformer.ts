import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/catalog/product'
import checkout from '#config/checkout'
import { mediaUrl } from '#transformers/shared/media_transformer'

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: checkout.currency })

/**
 * The compact product card the shopping assistant shows, which is also what the model reads.
 * Availability is only ever in or out of stock, never a count.
 */
export default class AssistantProductTransformer extends BaseTransformer<Product> {
  async toObject() {
    const media = await this.resource.media.all()
    const image = media.find((item) => item.attachment.mimeType.startsWith('image/'))
    // Preloaded by every caller; absent only if a caller forgot, which reads as out of stock.
    const variants = this.resource.$preloaded.variants ? this.resource.variants : []
    const sellable = variants.filter((variant) => variant.isSellable)
    const prices = (sellable.length ? sellable : variants).map((variant) =>
      Number(variant.priceAmount)
    )
    const price = prices.length ? Math.min(...prices) : 0

    return {
      ...this.pick(this.resource, ['id', 'title', 'handle']),
      image: image ? mediaUrl(image) : null,
      price: { raw: price, formatted: currency.format(price) },
      availability: sellable.length ? ('in_stock' as const) : ('out_of_stock' as const),
    }
  }
}
