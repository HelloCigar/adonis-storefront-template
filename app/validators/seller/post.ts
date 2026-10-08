import vine from '@vinejs/vine'
import { blogPostStatuses } from '#models/content/blog_post'
import { handle } from '#validators/seller/rules'

/** Largest document accepted, so one post cannot bloat every page that renders it. */
const MAX_CONTENT_LENGTH = 512 * 1024

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const tiptapDocument = vine.createRule((value, _options, field) => {
  const document = typeof value === 'string' ? parseJson(value) : undefined
  if (
    typeof document !== 'object' ||
    document === null ||
    (document as { type?: unknown }).type !== 'doc'
  )
    field.report('The post content could not be read', 'tiptapDocument', field)
})

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
    .maxLength(MAX_CONTENT_LENGTH)
    .use(tiptapDocument())
    .transform((value) => JSON.parse(value) as unknown),
  status: vine.enum(blogPostStatuses),
  publishedAt: vine.date({ formats: ['iso8601'] }).nullable(),
})
