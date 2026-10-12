import { StorePolicySchema } from '#database/schema'
import { jsonColumn } from '#models/shared/json_column'
import type { RichTextDocument } from '#services/content/rich_text_service'
import type { StorePolicyHandle } from '#values/store_policy_handle'
import { column, scope } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class StorePolicy extends compose(StorePolicySchema, withUlidPrimaryKey()) {
  /** Saved policies with something to show; an emptied policy keeps its row but stays hidden. */
  static withContent = scope((query) => {
    query.whereNot('content_html', '')
  })

  @column() declare handle: StorePolicyHandle

  /** The editor's Tiptap JSON document, already normalized by RichTextService. */
  @column(jsonColumn) declare content: RichTextDocument
}
