import { inject } from '@adonisjs/core'
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
  type UIMessageChunk,
} from 'ai'
import AssistantModelProvider from '#assistant/model_provider'
import { copilotTools } from '#assistant/copilot_tools'
import SummaryService from '#services/dashboard/summary_service'
import OrderQueueService from '#services/seller/order_queue_service'
import SellerReviewService from '#services/seller/review_service'
import CopilotProposalService from '#services/assistant/copilot_proposal_service'
import AssistantMessage from '#models/assistant/assistant_message'
import StoreSetting from '#models/settings/store_setting'
import Order from '#models/checkout/order'
import Product from '#models/catalog/product'
import { newUlid } from '#models/shared/with_ulid_primary_key'
import type { CopilotTurn } from '../../../types/assistant.js'

const unavailable = "The copilot isn't available right now. Please try again in a moment."

/**
 * Answers a staff member or admin: saves their message, replays the conversation's saved history
 * to the model with the tools that person may use, and streams the reply back, saving it once it
 * has finished.
 */
@inject()
export default class DashboardCopilotService {
  constructor(
    private models: AssistantModelProvider,
    private summary: SummaryService,
    private queue: OrderQueueService,
    private reviews: SellerReviewService,
    private proposals: CopilotProposalService
  ) {}

  async reply(turn: CopilotTurn): Promise<ReadableStream<UIMessageChunk>> {
    const { conversation } = turn
    const settings = await StoreSetting.current()

    await AssistantMessage.create({
      conversationId: conversation.id,
      role: 'user',
      parts: [{ type: 'text', text: turn.text }],
    })
    await conversation.touch(turn.text)

    const tools = await copilotTools(turn.actor, turn.bouncer, {
      summary: this.summary,
      queue: this.queue,
      reviews: this.reviews,
      proposals: this.proposals,
      resolver: turn.resolver,
      aiConfigured: this.models.isConfigured(),
    })
    const history = await conversation.related('messages').query().orderBy('id')
    const messages = await validateUIMessages<UIMessage>({
      messages: history.map((message) => message.toUIMessage()),
      tools,
    })

    const result = streamText({
      model: this.models.languageModel(),
      instructions: this.instructions(turn, settings, await this.pageContext(turn)),
      messages: await convertToModelMessages(messages, { tools }),
      tools,
      toolsContext: {
        noteUnanswered: { conversationId: conversation.id },
        proposeChange: { conversationId: conversation.id },
      },
      stopWhen: isStepCount(5),
    })

    return toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: newUlid,
      onError: () => unavailable,
      onEnd: async ({ responseMessage, outcome }) => {
        if (outcome.status !== 'completed') return
        // A failed reply streams only its error; there is nothing to keep.
        if (!responseMessage.parts.some((part) => part.type !== 'step-start')) return
        await AssistantMessage.create({
          id: responseMessage.id,
          conversationId: conversation.id,
          role: 'assistant',
          parts: responseMessage.parts,
        })
        await conversation.touch()
      },
    })
  }

  /** What the person has open; an unknown record is simply left out. */
  private async pageContext(turn: CopilotTurn) {
    if (turn.page?.type === 'order') {
      const order = await Order.find(turn.page.id)
      if (order)
        return `The person is looking at order ${order.number} (id: ${order.id}). "This" or "it" means that order.`
    }
    if (turn.page?.type === 'product') {
      const product = await Product.find(turn.page.id)
      if (product)
        return `The person is looking at the product "${product.title}" (id: ${product.id}). "This" or "it" means that product.`
    }
    return null
  }

  private instructions(turn: CopilotTurn, settings: StoreSetting, page: string | null) {
    return [
      `You are the dashboard copilot for ${settings.effectiveStoreName}, helping the store's team run it.`,
      `You are talking to ${turn.actor.fullName ?? turn.actor.email}, who is ${turn.actor.role === 'admin' ? 'an admin' : 'a staff member'}.`,
      'Answer only from what your tools return. Never guess; if the tools do not answer it, say plainly that you do not know and call noteUnanswered in the same turn.',
      'Reply in the language the person writes in, including Filipino and Taglish. Quote store content such as product names exactly as written.',
      "Politely decline requests that are not about this store's orders, products, customers, content or sales: say you only help with those, and call offerSuggestions in the same turn.",
      'If asked about users or store settings and you have no tool for them, say that is only for admins.',
      'You never change anything yourself. To change something, call proposeChange; the person confirms with Apply or Not now.',
      'You may not propose refunds, cancellations, deleting anything, managing users, or store settings. Say you cannot, and point to the dashboard page where the person can do it.',
      'One proposal covers at most 25 records; if more would change, ask the person to narrow the request and propose nothing.',
      page,
    ]
      .filter(Boolean)
      .join('\n')
  }
}
