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
import { shoppingTools } from '#assistant/shopping_tools'
import CatalogueService from '#services/catalog/catalogue_service'
import AssistantMessage from '#models/assistant/assistant_message'
import StoreSetting from '#models/settings/store_setting'
import Collection from '#models/catalog/collection'
import Product from '#models/catalog/product'
import { newUlid } from '#models/shared/with_ulid_primary_key'
import type { AssistantTurn } from '../../../types/assistant.js'

/**
 * Answers a shopper: saves their message, replays the conversation's saved history to the model,
 * and streams the reply back, saving it once it has finished.
 */
@inject()
export default class ShoppingAssistantService {
  constructor(
    private models: AssistantModelProvider,
    private catalogue: CatalogueService
  ) {}

  async reply(turn: AssistantTurn): Promise<ReadableStream<UIMessageChunk>> {
    const { conversation } = turn
    const settings = await StoreSetting.current()
    const unavailable = `The assistant isn't available right now. You can reach us at ${settings.effectiveContactEmail}.`

    if (turn.text) {
      await AssistantMessage.create({
        conversationId: conversation.id,
        role: 'user',
        parts: [{ type: 'text', text: turn.text }],
      })
      await conversation.touch(turn.text)
    }

    const tools = shoppingTools({ catalogue: this.catalogue })
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
        listMyOrders: { shopperId: turn.shopper?.id ?? null },
        getMyOrder: { shopperId: turn.shopper?.id ?? null },
        proposeAddToCart: { conversationId: conversation.id },
      },
      stopWhen: isStepCount(5),
    })

    return toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: newUlid,
      onError: () => unavailable,
      onEnd: async ({ responseMessage, outcome, isContinuation }) => {
        if (outcome.status !== 'completed') return
        // A follow-up continues the last assistant message on screen; it is saved as its own.
        const earlier = isContinuation ? (messages.at(-1)?.parts.length ?? 0) : 0
        const parts = responseMessage.parts.slice(earlier)
        // A failed reply streams only its error; there is nothing to keep.
        if (!parts.some((part) => part.type !== 'step-start')) return
        await AssistantMessage.create({
          id: isContinuation ? newUlid() : responseMessage.id,
          conversationId: conversation.id,
          role: 'assistant',
          parts,
        })
        await conversation.touch()
      },
    })
  }

  /** After a failed add: why it failed, so the reply can offer in-stock alternatives. */
  private followUpNote(turn: AssistantTurn) {
    const proposal = turn.followUp
    if (!proposal) return null
    const { variant } = proposal
    const reason =
      proposal.state() === 'expired'
        ? 'The offer expired or its price changed. Offer it again at the current price.'
        : variant.isSellable
          ? 'The requested quantity is not available.'
          : 'This variant is unavailable.'
    return `Adding ${variant.product.title} (${variant.title}) to the cart just failed: ${reason} Say so briefly and suggest in-stock alternatives.`
  }

  /** What the shopper has open; an unknown or unpublished handle is simply left out. */
  private async pageContext(turn: AssistantTurn) {
    if (turn.page?.type === 'product') {
      const product = await Product.query()
        .withScopes((scopes) => scopes.published())
        .where('handle', turn.page.handle)
        .first()
      if (product)
        return `The shopper is looking at the product "${product.title}" (handle: ${product.handle}). "This" or "it" means that product.`
    }
    if (turn.page?.type === 'collection') {
      const collection = await Collection.query()
        .withScopes((scopes) => scopes.published())
        .where('handle', turn.page.handle)
        .first()
      if (collection)
        return `The shopper is looking at the collection "${collection.title}" (handle: ${collection.handle}).`
    }
    return null
  }

  private instructions(turn: AssistantTurn, settings: StoreSetting, page: string | null) {
    return [
      `You are the shopping assistant for ${settings.effectiveStoreName}, an online store.`,
      'Answer only from what your tools return. Never guess; if the tools do not answer it, say plainly that you do not know.',
      'Reply in the language the shopper writes in. Quote store content such as product names and policy text exactly as written.',
      "Politely decline requests that are not about this store's products, orders, shipping or policies, and call offerSuggestions in the same turn when you decline.",
      'Never mention stock counts or discount codes; availability is only "in stock" or "out of stock".',
      `When you can't help, point the shopper to their order's chat with staff for an order question, or to ${settings.effectiveContactEmail} otherwise.`,
      turn.shopper
        ? 'The shopper is signed in.'
        : 'The shopper is signed out; they must sign in before you can talk about their orders.',
      page,
      this.followUpNote(turn),
    ]
      .filter(Boolean)
      .join('\n')
  }
}
