import type Collection from '#models/catalog/collection'
import MediaTransformer from '#transformers/shared/media_transformer'
import ProductTransformer from '#transformers/catalog/product_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CollectionTransformer extends BaseTransformer<Collection> {
  async toObject() {
    const image = await this.resource.image.get()

    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'handle',
        'description',
        'descriptionHtml',
        'seoTitle',
        'seoDescription',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]),
      image: MediaTransformer.transform(image),
      products: ProductTransformer.transform(this.whenLoaded(this.resource.products)),
    }
  }
}
