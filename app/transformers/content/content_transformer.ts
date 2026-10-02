import { BaseTransformer } from '@adonisjs/core/transformers'
import type { StoreContent } from '#config/storefront'

export default class ContentTransformer extends BaseTransformer<StoreContent> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'handle',
      'title',
      'body',
      'bodySummary',
      'contentHtml',
      'excerpt',
      'publishedAt',
      'seo',
    ])
  }
}
