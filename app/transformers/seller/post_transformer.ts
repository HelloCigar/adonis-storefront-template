import { BaseTransformer } from '@adonisjs/core/transformers'
import type BlogPost from '#models/content/blog_post'

export default class SellerPostTransformer extends BaseTransformer<BlogPost> {
  toObject() {
    const author = this.resource.author
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'handle',
        'excerpt',
        'badge',
        'status',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]),
      authorName: author ? author.fullName || author.email : null,
    }
  }

  /** The editor reopens the stored Tiptap document. */
  forEditor() {
    return { ...this.toObject(), content: this.resource.content }
  }
}
