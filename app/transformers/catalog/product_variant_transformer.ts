import type Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'
import MediaTransformer from '#transformers/shared/media_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'

export default class ProductVariantTransformer extends BaseTransformer<ProductVariant> {
  constructor(
    resource: ProductVariant,
    private parentProduct?: Product,
    private productMedia?: AttachmentLinkModel[]
  ) {
    super(resource)
  }

  toObject() {
    const product = this.parentProduct ?? (this.resource.$preloaded.product as Product | undefined)
    const featuredMedia =
      this.productMedia?.find((item) => item.id === this.resource.featuredMediaId) ??
      (this.resource.$preloaded.featuredMedia as AttachmentLinkModel | undefined)

    return {
      ...this.pick(this.resource, [
        'id',
        'productId',
        'featuredMediaId',
        'title',
        'sku',
        'barcode',
        'options',
        'availableForSale',
        'inventoryQuantity',
        'position',
        'createdAt',
        'updatedAt',
      ]),
      options: this.resource.safeOptions,
      hasInvalidOptions: this.resource.hasInvalidOptions,
      price: {
        amount: this.resource.priceAmount,
        currencyCode: this.resource.currencyCode,
      },
      compareAtPrice:
        this.resource.compareAtPriceAmount === null
          ? null
          : {
              amount: this.resource.compareAtPriceAmount,
              currencyCode: this.resource.currencyCode,
            },
      availableForSale: this.resource.isSellable,
      quantityAvailable: this.resource.quantityAvailable,
      selectedOptions: Object.entries(this.resource.safeOptions ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
      image: featuredMedia ? MediaTransformer.transform(featuredMedia) : null,
      featuredMedia: featuredMedia ? MediaTransformer.transform(featuredMedia) : null,
      product: product
        ? {
            id: product.id,
            title: product.title,
            handle: product.handle,
          }
        : undefined,
    }
  }
}
