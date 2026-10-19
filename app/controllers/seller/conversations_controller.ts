import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/account/user'
import AssistantConversation from '#models/assistant/assistant_conversation'
import ConversationPolicy from '#policies/seller/conversation_policy'
import ReviewConversationTransformer from '#transformers/seller/review_conversation_transformer'
import { conversationIndexQueryValidator } from '#validators/seller/conversation'

export default class ConversationsController {
  /** Both assistants' conversations, newest first, narrowed by the admin's filters. */
  async index({ request, inertia, bouncer }: HttpContext) {
    await bouncer.with(ConversationPolicy).authorize('viewAny')
    const { page, ...filters } = await request.validateUsing(conversationIndexQueryValidator)
    const conversations = await AssistantConversation.query()
      .withScopes((scopes) => scopes.forReview(filters))
      .paginate(page ?? 1, 25)
    // Everyone who has had a conversation, for the person filter.
    const people = await User.query()
      .whereHas('assistantConversations', () => {})
      .orderBy('full_name')
      .orderBy('email')
    return inertia.render('seller/conversations', {
      conversations: ReviewConversationTransformer.paginate(
        conversations.all(),
        conversations.getMeta()
      ),
      filters: {
        assistant: filters.assistant,
        userId: filters.userId,
        from: filters.from?.toISODate() ?? undefined,
        to: filters.to?.toISODate() ?? undefined,
        changesApplied: filters.changesApplied,
        unanswered: filters.unanswered,
      },
      people: people.map((person) => ({ id: person.id, name: person.fullName || person.email })),
    })
  }

  /** Read-only: admins can't reply to, edit or delete a conversation. */
  async show({ params, inertia, bouncer }: HttpContext) {
    const conversation = await AssistantConversation.findOrFail(params.id)
    await bouncer.with(ConversationPolicy).authorize('view', conversation)
    await conversation.load('messages', (query) => query.orderBy('id'))
    await conversation.load('copilotProposals', (query) =>
      query.orderBy('id').preload('items', (items) => items.orderBy('position'))
    )
    await conversation.load('proposals', (query) =>
      query.orderBy('id').preload('variant', (variant) => variant.preload('product'))
    )
    await conversation.load('user')
    return inertia.render('seller/conversation', {
      conversation: ReviewConversationTransformer.transform(conversation)
        .useVariant('forTranscript')
        .depth(3),
    })
  }
}
