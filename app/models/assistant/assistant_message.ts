import { AssistantMessageSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { jsonColumn } from '#models/shared/json_column'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import type { AssistantMessagePart, AssistantRole } from '#values/assistant'

export default class AssistantMessage extends compose(
  AssistantMessageSchema,
  withUlidPrimaryKey()
) {
  @column(jsonColumn)
  declare parts: AssistantMessagePart[]

  @column()
  declare role: AssistantRole

  @belongsTo(() => AssistantConversation, { foreignKey: 'conversationId' })
  declare conversation: BelongsTo<typeof AssistantConversation>

  /** The AI SDK UI message shape that both the model and the browser read. */
  toUIMessage() {
    return { id: this.id, role: this.role, parts: this.parts }
  }
}
