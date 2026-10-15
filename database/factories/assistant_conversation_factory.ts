import factory from '@adonisjs/lucid/factories'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { DateTime } from 'luxon'
import { AssistantMessageFactory } from './assistant_message_factory.js'

export const AssistantConversationFactory = factory
  .define(AssistantConversation, ({ faker }) => ({
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    lastMessageAt: DateTime.now(),
  }))
  .relation('messages', () => AssistantMessageFactory)
  .build()
