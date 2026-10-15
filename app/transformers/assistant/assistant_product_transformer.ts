import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/catalog/product'
import type ProductReview from '#models/catalog/product_review'
import type { ReviewSummary } from '#services/catalog/review_service'
import checkout from '#config/checkout'
import { mediaUrl } from '#transformers/shared/media_transformer'

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: checkout.currency })

/**
 * The compact product card the shopping assistant shows, which is also what the model reads.
 * Availability is only ever in or out of stock, never a count.
 */
export default class AssistantProductTransformer extends BaseTransformer<Product> {
  #reviews: { summary: ReviewSummary; top: ProductReview[] } | null

  /** `reviews`: the approved-review summary and a few approved reviews, for `forDetail()`. */
  constructor(
    resource: Product,
    reviews: { summary: ReviewSummary; top: ProductReview[] } | null = null
  ) {
    super(resource)
    this.#reviews = reviews
  }

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

  /** The product with its description, every variant and its reviews; needs `variants` preloaded. */
  async forDetail() {
    const variants = this.resource.$preloaded.variants ? this.resource.variants : []
    return {
      ...(await this.toObject()),
      description: this.resource.description ?? '',
      variants: variants.map((variant) => {
        const price = Number(variant.priceAmount)
        return {
          id: variant.id,
          title: variant.title,
          options: variant.safeOptions,
          price: { raw: price, formatted: currency.format(price) },
          availability: variant.isSellable ? ('in_stock' as const) : ('out_of_stock' as const),
        }
      }),
      reviews: {
        average: this.#reviews?.summary.average ?? null,
        count: this.#reviews?.summary.count ?? 0,
        top: (this.#reviews?.top ?? []).map((review) => ({
          rating: review.rating,
          body: review.body,
        })),
      },
    }
  }
}
