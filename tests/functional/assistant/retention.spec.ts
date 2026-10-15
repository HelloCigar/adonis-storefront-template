import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { AssistantConversationFactory } from '#database/factories/assistant_conversation_factory'
import PurgeAssistantConversations from '#jobs/assistant/purge_assistant_conversations'
import { runQueue } from '#tests/helpers/queue'

test.group('Shopping assistant retention', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the retention job removes conversations unused for more than 90 days and keeps the rest', async ({
    db,
  }) => {
    const old = await AssistantConversationFactory.merge({
      lastMessageAt: DateTime.now().minus({ days: 91 }),
    })
      .with('messages', 2)
      .create()
    const recent = await AssistantConversationFactory.merge({
      lastMessageAt: DateTime.now().minus({ days: 89 }),
    })
      .with('messages', 2)
      .create()

    await PurgeAssistantConversations.dispatch({})
    await runQueue(['maintenance'])

    await db.assertMissing('assistant_conversations', { id: old.id })
    await db.assertMissing('assistant_messages', { conversation_id: old.id })
    await db.assertHas('assistant_conversations', { id: recent.id })
  })
})
