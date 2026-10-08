import vine from '@vinejs/vine'
import { blogPostStatuses } from '#models/content/blog_post'
import { handle } from '#validators/seller/rules'

export const postValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  handle: handle('blog_posts'),
  excerpt: vine.string().trim().maxLength(500).nullable(),
  /** Tiptap JSON; RichTextService keeps only the nodes and marks it knows how to render. */
  content: vine
    .object({ type: vine.literal('doc'), content: vine.array(vine.any()).maxLength(5000) })
    .allowUnknownProperties(),
  status: vine.enum(blogPostStatuses),
  publishedAt: vine.date({ formats: ['iso8601'] }).nullable(),
})
