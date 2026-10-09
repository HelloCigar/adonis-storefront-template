import { inject } from '@adonisjs/core'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import type BlogPost from '#models/content/blog_post'
import RichTextService from '#services/content/rich_text_service'
import type { postValidator } from '#validators/seller/post'

export type PostPayload = Infer<typeof postValidator>

@inject()
export default class SellerPostService {
  constructor(private richText: RichTextService) {}

  /**
   * Saves the normalized document and the HTML rendered from it together, so `content_html`
   * always matches `content`. Publishing without a date publishes now and keeps the original
   * date on later edits; a future date schedules the post.
   */
  async save(post: BlogPost, payload: PostPayload, actorId: number) {
    const content = await this.richText.normalize(payload.content)
    const published = payload.status === 'published'
    if (published && !this.richText.hasContent(content))
      throw new errors.E_VALIDATION_ERROR([
        { field: 'content', rule: 'required', message: 'Write the post before publishing it' },
      ])
    post.merge({
      title: payload.title,
      handle: payload.handle,
      excerpt: payload.excerpt || null,
      badge: payload.badge || null,
      content,
      contentHtml: this.richText.toHtml(content),
      status: payload.status,
      publishedAt:
        payload.publishedAt?.toUTC() ?? (published ? (post.publishedAt ?? DateTime.utc()) : null),
    })
    if (!post.$isPersisted) post.authorId = actorId
    await post.save()
    return post
  }
}
