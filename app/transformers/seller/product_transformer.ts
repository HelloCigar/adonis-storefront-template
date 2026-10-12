import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'
import { lowStockThreshold } from '#models/catalog/product_variant'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import SellerVariantTransformer from '#transformers/seller/variant_transformer'
import { mediaUrl } from '#transformers/shared/media_transformer'
import OptionsService, { variantGenerationLimit } from '#services/catalog/options_service'
import { inject } from '@adonisjs/core'

export default class SellerProductTransformer extends BaseTransformer<Product> {
  constructor(
    resource: Product,
    private covers?: Map<string, AttachmentLinkModel>
  ) {
    super(resource)
  }

  @inject()
  toObject(options: OptionsService) {
    const variants = this.resource.$preloaded.variants as ProductVariant[] | undefined
    const cover = this.covers?.get(this.resource.id)
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'handle',
        'description',
        'vendor',
        'productType',
        'status',
      ]),
      thumbnailUrl: cover ? mediaUrl(cover) : null,
      optionDefinitions: this.resource.optionDefinitions,
      optionIssues: options.issues(this.resource.optionDefinitions, variants ?? []),
      generatedLimit: variantGenerationLimit,
      stock: variants ? this.stock(variants) : null,
      variants: SellerVariantTransformer.transform(this.whenLoaded(this.resource.variants)),
    }
  }

  /** One stock state per product so the list can flag what needs restocking. */
  private stock(variants: ProductVariant[]) {
    const tracked = variants.filter((variant) => variant.quantityAvailable !== null)
    const outOfStock = variants.filter((variant) => variant.stockLevel === 'out').length
    const lowStock = variants.filter((variant) => variant.stockLevel === 'low').length
    const level = !variants.length
      ? ('no_variants' as const)
      : outOfStock === variants.length
        ? ('out' as const)
        : outOfStock
          ? ('some_out' as const)
          : lowStock
            ? ('low' as const)
            : tracked.length
              ? ('in_stock' as const)
              : ('untracked' as const)
    return {
      level,
      available: tracked.length
        ? tracked.reduce((total, variant) => total + Math.max(0, variant.quantityAvailable!), 0)
        : null,
      untracked: variants.length - tracked.length,
      outOfStock,
      lowStock,
      lowStockThreshold,
    }
  }
}
