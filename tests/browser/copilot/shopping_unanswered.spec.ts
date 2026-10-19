import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { assistantOn, sendMessage } from '#tests/helpers/assistant'

test.group('Shopping assistant unanswered questions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("a shopping-assistant decline flags the conversation as couldn't answer", async ({
    visit,
    route,
    assert,
  }) => {
    const { model } = await assistantOn()
    model.callTool('noteUnanswered', {}, "I don't know that.")

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you sell cars?')

    await page.assertPath(route('home'))
    const conversation = await AssistantConversation.query()
      .where('assistant', 'shopping')
      .firstOrFail()
    assert.isNotNull(conversation.lastUnansweredAt)
  })
})
