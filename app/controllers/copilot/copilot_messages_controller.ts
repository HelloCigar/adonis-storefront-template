import { Readable } from 'node:stream'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { createUIMessageStreamResponse } from 'ai'
import AssistantConversation from '#models/assistant/assistant_conversation'
import CopilotConversationPolicy from '#policies/assistant/copilot_conversation_policy'
import DashboardCopilotService from '#services/assistant/dashboard_copilot_service'
import { storeCopilotMessageValidator } from '#validators/assistant/copilot_message'

export default class CopilotMessagesController {
  /** Streams the copilot's reply to one message as server-sent events. No session writes. */
  @inject()
  async store(
    { params, request, response, auth, bouncer, containerResolver }: HttpContext,
    copilot: DashboardCopilotService
  ) {
    const conversation = await AssistantConversation.findOrFail(params.conversationId)
    await bouncer.with(CopilotConversationPolicy).authorize('send', conversation)
    const { text, page } = await request.validateUsing(storeCopilotMessageValidator)

    const stream = await copilot.reply({
      conversation,
      actor: auth.getUserOrFail(),
      bouncer,
      resolver: containerResolver,
      page,
      text,
    })
    const sse = createUIMessageStreamResponse({ stream })
    sse.headers.forEach((value, name) => response.header(name, value))
    response.stream(Readable.from(sse.body!))
  }
}
