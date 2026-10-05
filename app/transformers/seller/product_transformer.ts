import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'
import SellerVariantTransformer from '#transformers/seller/variant_transformer'
import OptionsService, { variantGenerationLimit } from '#services/catalog/options_service'
import { inject } from '@adonisjs/core'

export default class SellerProductTransformer extends BaseTransformer<Product> {
  @inject()
  toObject(options: OptionsService) {
    const variants = this.resource.$preloaded.variants as ProductVariant[] | undefined
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
      optionDefinitions: this.resource.optionDefinitions,
      optionIssues: options.issues(this.resource.optionDefinitions, variants ?? []),
      generatedLimit: variantGenerationLimit,
      variants: SellerVariantTransformer.transform(this.whenLoaded(this.resource.variants)),
    }
  }
}
