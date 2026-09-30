import type Collection from '#models/collection'
import type Product from '#models/product'
import CollectionTransformer from '#transformers/collection_transformer'
import ProductTransformer from '#transformers/product_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SearchResultTransformer extends BaseTransformer<{
  products: Product[]
  collections: Collection[]
}> {
  toObject() {
    return {
      products: ProductTransformer.transform(this.resource.products).depth(4),
      collections: CollectionTransformer.transform(this.resource.collections).depth(4),
    }
  }
}
