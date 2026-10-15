import factory from '@adonisjs/lucid/factories'
import AssistantMessage from '#models/assistant/assistant_message'
import { AssistantConversationFactory } from './assistant_conversation_factory.js'

export const AssistantMessageFactory = factory
  .define(AssistantMessage, ({ faker }) => ({
    role: 'user' as const,
    parts: [{ type: 'text' as const, text: faker.lorem.sentence() }],
  }))
  .state('fromAssistant', (message) => {
    message.role = 'assistant'
  })
  .before('create', async (_builder, message, ctx) => {
    if (!message.conversationId) {
      const conversation = await AssistantConversationFactory.useCtx(ctx).create()
      message.conversationId = conversation.id
    }
  })
  .build()
