import { BlogPostSchema } from '#database/schema'
import User from '#models/account/user'
import { jsonColumn } from '#models/shared/json_column'
import { sqlDateTime } from '#models/shared/sql_datetime'
import type { RichTextDocument } from '#services/content/rich_text_service'
import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export const blogPostStatuses = ['draft', 'published'] as const
export type BlogPostStatus = (typeof blogPostStatuses)[number]

export default class BlogPost extends compose(BlogPostSchema, withUlidPrimaryKey()) {
  /** Published posts whose publish time has passed, newest first. */
  static published = scope((query) => {
    query
      .where('status', 'published')
      .whereNotNull('published_at')
      .where('published_at', '<=', sqlDateTime())
      .orderBy('published_at', 'desc')
  })

  @column() declare status: BlogPostStatus

  /** The editor's Tiptap JSON document, already normalized by RichTextService. */
  @column(jsonColumn) declare content: RichTextDocument

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
