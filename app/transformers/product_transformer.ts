import type Product from '#models/product'
import type ProductVariant from '#models/product_variant'
import MediaTransformer from '#transformers/media_transformer'
import ProductVariantTransformer from '#transformers/product_variant_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ProductTransformer extends BaseTransformer<Product> {
  async toObject() {
    const media = await this.resource.media.all()
    const images = media.filter((item) => item.attachment.mimeType.startsWith('image/'))
    const variants = (this.resource.$preloaded.variants as ProductVariant[] | undefined) ?? []
    const availableVariant = variants.find((variant) => variant.availableForSale) ?? variants[0]
    const prices = variants.map((variant) => variant.priceAmount)
    const compareAtPrices = variants
      .map((variant) => variant.compareAtPriceAmount)
      .filter((amount): amount is number => amount !== null)
    const currencyCode = variants[0]?.currencyCode
    const optionValues = new Map<string, Set<string>>()

    for (const variant of variants) {
      for (const [name, value] of Object.entries(variant.options ?? {})) {
        const values = optionValues.get(name) ?? new Set<string>()
        values.add(String(value))
        optionValues.set(name, values)
      }
    }

    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'handle',
        'description',
        'descriptionHtml',
        'vendor',
        'productType',
        'status',
        'isGiftCard',
        'tags',
        'seoTitle',
        'seoDescription',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]),
      availableForSale: variants.length
        ? variants.some((variant) => variant.availableForSale)
        : undefined,
      priceRange:
        prices.length && currencyCode
          ? {
              minVariantPrice: { amount: Math.min(...prices), currencyCode },
              maxVariantPrice: { amount: Math.max(...prices), currencyCode },
            }
          : undefined,
      compareAtPriceRange:
        compareAtPrices.length && currencyCode
          ? {
              minVariantPrice: { amount: Math.min(...compareAtPrices), currencyCode },
              maxVariantPrice: { amount: Math.max(...compareAtPrices), currencyCode },
            }
          : undefined,
      options: [...optionValues].map(([name, values], index) => ({
        id: `${this.resource.id}:${index + 1}`,
        name,
        values: [...values],
        optionValues: [...values].map((value) => ({ name: value })),
      })),
      media: MediaTransformer.transform(media),
      images: MediaTransformer.transform(images),
      featuredImage: images[0] ? MediaTransformer.transform(images[0]) : null,
      variants: ProductVariantTransformer.transform(
        this.whenLoaded(this.resource.variants),
        this.resource,
        media
      ),
      selectedOrFirstAvailableVariant: availableVariant
        ? ProductVariantTransformer.transform(availableVariant, this.resource, media).depth(2)
        : null,
    }
  }
}
