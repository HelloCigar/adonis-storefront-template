import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import AssistantConversation from '#models/assistant/assistant_conversation'
import CopilotConversationPolicy from '#policies/assistant/copilot_conversation_policy'
import CopilotConversationTransformer from '#transformers/assistant/copilot_conversation_transformer'

export default class CopilotConversationsController {
  /** The person's 50 most recently used copilot conversations. */
  async index({ auth, bouncer, serialize }: HttpContext) {
    await bouncer.with(CopilotConversationPolicy).authorize('viewAny')
    const user = auth.getUserOrFail()
    const conversations = await user
      .related('assistantConversations')
      .query()
      .withScopes((scopes) => {
        scopes.ofAssistant('copilot')
        scopes.ownedBy(user.id)
      })
      .limit(50)
    return serialize(CopilotConversationTransformer.transform(conversations))
  }

  /** Has no side effects. */
  async show({ params, bouncer, serialize }: HttpContext) {
    const conversation = await AssistantConversation.findOrFail(params.id)
    await bouncer.with(CopilotConversationPolicy).authorize('view', conversation)
    await conversation.load('messages', (query) => query.orderBy('id'))
    await conversation.load('copilotProposals', (query) =>
      query.preload('items', (items) => items.orderBy('position'))
    )
    return serialize(CopilotConversationTransformer.transform(conversation).useVariant('forThread'))
  }

  async store({ auth, bouncer, serialize }: HttpContext) {
    await bouncer.with(CopilotConversationPolicy).authorize('create')
    const user = auth.getUserOrFail()
    const conversation = await AssistantConversation.create({
      userId: user.id,
      assistant: 'copilot',
      participantName: user.fullName,
      lastMessageAt: DateTime.now(),
    })
    return serialize(CopilotConversationTransformer.transform(conversation))
  }
}
