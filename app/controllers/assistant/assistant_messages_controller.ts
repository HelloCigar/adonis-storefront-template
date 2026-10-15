import { Readable } from 'node:stream'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { createUIMessageStreamResponse } from 'ai'
import AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantConversationPolicy from '#policies/assistant/assistant_conversation_policy'
import ShoppingAssistantService from '#services/assistant/shopping_assistant_service'
import { storeAssistantMessageValidator } from '#validators/assistant/assistant_message'

export default class AssistantMessagesController {
  /** Streams the shopping assistant's reply to one message as server-sent events. */
  @inject()
  async store(
    { params, request, response, auth, bouncer, assistantSession, checkoutSession }: HttpContext,
    assistant: ShoppingAssistantService
  ) {
    const conversation = await AssistantConversation.findOrFail(params.conversationId)
    await bouncer
      .with(AssistantConversationPolicy)
      .authorize('send', conversation, assistantSession.currentConversationId())
    const payload = await request.validateUsing(storeAssistantMessageValidator)

    // Session writes happen before streaming starts, so the cookie leaves with the headers.
    if (auth.user) await conversation.claimFor(auth.user)
    assistantSession.rememberConversation(conversation.id)

    // A follow-up's proposal can only come from this same conversation.
    const followUp =
      'proposalId' in payload
        ? await conversation
            .related('proposals')
            .query()
            .where('id', payload.proposalId)
            .preload('variant', (query) => query.preload('product'))
            .firstOrFail()
        : null

    const stream = await assistant.reply({
      conversation,
      shopper: auth.user,
      cartToken: checkoutSession.cartToken(),
      page: payload.page,
      text: 'text' in payload ? payload.text : null,
      followUp,
    })
    const sse = createUIMessageStreamResponse({ stream })
    sse.headers.forEach((value, name) => response.header(name, value))
    response.stream(Readable.from(sse.body!))
  }
}
