import { BaseTransformer } from '@adonisjs/core/transformers'
import type BlogPost from '#models/content/blog_post'

export default class BlogPostTransformer extends BaseTransformer<BlogPost> {
  toObject() {
    const author = this.resource.author
    return {
      ...this.pick(this.resource, ['id', 'handle', 'title', 'excerpt', 'badge', 'publishedAt']),
      // Readers see the author's display name only, never their account details.
      authorName: author?.fullName || null,
    }
  }

  forDetailedView() {
    return { ...this.toObject(), contentHtml: this.resource.contentHtml }
  }
}
