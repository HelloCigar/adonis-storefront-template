import vine from '@vinejs/vine'
import { blogPostStatuses } from '#models/content/blog_post'
import { handle } from '#validators/seller/rules'
import { MAX_RICH_TEXT_LENGTH, richTextDocument } from '#validators/shared/rich_text'

export const postValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  handle: handle('blog_posts'),
  excerpt: vine.string().trim().maxLength(500).nullable(),
  badge: vine.string().trim().maxLength(40).nullable(),
  /**
   * The editor's Tiptap JSON, sent as a string because the body parser trims every JSON string
   * value, which would drop spaces at the edges of bold or linked text. RichTextService keeps
   * only the nodes and marks it knows how to render.
   */
  content: vine
    .string()
    .maxLength(MAX_RICH_TEXT_LENGTH)
    .use(richTextDocument())
    .transform((value) => JSON.parse(value) as unknown),
  status: vine.enum(blogPostStatuses),
  publishedAt: vine.date({ formats: ['iso8601'] }).nullable(),
})
