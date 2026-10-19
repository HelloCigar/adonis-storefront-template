import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantConversationPolicy from '#policies/assistant/assistant_conversation_policy'
import AssistantConversationTransformer from '#transformers/assistant/assistant_conversation_transformer'

export default class AssistantConversationsController {
  /** The signed-in shopper's 50 most recently used conversations. */
  async index({ auth, bouncer, serialize }: HttpContext) {
    await bouncer.with(AssistantConversationPolicy).authorize('viewAny')
    const user = auth.getUserOrFail()
    const conversations = await user
      .related('assistantConversations')
      .query()
      .withScopes((scopes) => {
        scopes.ofAssistant('shopping')
        scopes.ownedBy(user.id)
      })
      .limit(50)
    return serialize(AssistantConversationTransformer.transform(conversations))
  }

  /** Has no side effects: opening a conversation never changes the browser's current one. */
  async show({ params, bouncer, assistantSession, serialize }: HttpContext) {
    const conversation = await AssistantConversation.findOrFail(params.id)
    await bouncer
      .with(AssistantConversationPolicy)
      .authorize('view', conversation, assistantSession.currentConversationId())
    await conversation.load('messages', (query) => query.orderBy('id'))
    await conversation.load('proposals', (query) => query.preload('variant'))
    return serialize(
      AssistantConversationTransformer.transform(conversation).useVariant('forThread')
    )
  }

  async store({ auth, assistantSession, serialize }: HttpContext) {
    const conversation = await AssistantConversation.create({
      userId: auth.user?.id ?? null,
      assistant: 'shopping',
      participantName: auth.user ? auth.user.fullName || auth.user.email : null,
      lastMessageAt: DateTime.now(),
    })
    assistantSession.rememberConversation(conversation.id)
    return serialize(AssistantConversationTransformer.transform(conversation))
  }

  /** Deleting is permanent: messages and proposals go with it, for admins too. */
  async destroy({ params, bouncer, assistantSession, serialize }: HttpContext) {
    const conversation = await AssistantConversation.findOrFail(params.id)
    await bouncer.with(AssistantConversationPolicy).authorize('delete', conversation)
    await conversation.delete()
    assistantSession.forgetConversation(conversation.id)
    return serialize({ id: conversation.id })
  }
}
