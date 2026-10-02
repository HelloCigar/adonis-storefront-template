import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueService from '#services/catalog/catalogue_service'
import ProductTransformer from '#transformers/catalog/product_transformer'

export default class CollectionCatalogueTransformer extends BaseTransformer<
  Awaited<ReturnType<CatalogueService['collectionProducts']>>
> {
  toObject() {
    const { products, ...state } = this.resource
    return { ...state, products: ProductTransformer.transform(products.all()).depth(3) }
  }
}
