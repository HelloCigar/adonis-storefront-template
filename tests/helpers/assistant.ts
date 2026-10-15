import { DateTime } from 'luxon'
import type { Page } from 'playwright'
import { useFake } from '@japa/plugin-adonisjs/helpers'
import limiter from '@adonisjs/limiter/services/main'
import type { ApiClient } from '@japa/api-client'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type User from '#models/account/user'
import AssistantModelProvider from '#assistant/model_provider'
import AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantMessage from '#models/assistant/assistant_message'
import AssistantProposal from '#models/assistant/assistant_proposal'
import type ProductVariant from '#models/catalog/product_variant'
import AssistantProposalTransformer from '#transformers/assistant/assistant_proposal_transformer'
import { assistantSessionKeys } from '#middleware/assistant/assistant_session_middleware'
import { serializer } from '#providers/api_provider'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { finishedStoreSetup } from '#tests/helpers/store_setup'
import { shippedOrder } from '#tests/helpers/delivery'

/**
 * A finished store with the shopping assistant switched on, answering through a scripted model.
 * `configured: false` stands in for a deployment without an AI key.
 */
export async function assistantOn(
  options: { contactEmail?: string; shippingMinor?: number; configured?: boolean } = {}
) {
  const settings = await finishedStoreSetup({
    contactEmail: options.contactEmail,
    shippingMinor: options.shippingMinor,
  })
  settings.shoppingAssistantEnabled = true
  await settings.save()
  const model = new FakeAssistantModelProvider(options.configured ?? true)
  useFake(AssistantModelProvider, model)
  return { settings, model }
}

/** A conversation the shopper had earlier, optionally with one question and its answer. */
export async function pastConversation(
  user: User,
  options: { title: string; lastMessageAt?: DateTime; exchange?: [string, string] }
) {
  const conversation = await AssistantConversation.create({
    userId: user.id,
    title: options.title,
    lastMessageAt: options.lastMessageAt ?? DateTime.now(),
  })
  if (options.exchange) {
    const [question, answer] = options.exchange
    await AssistantMessage.create({
      conversationId: conversation.id,
      role: 'user',
      parts: [{ type: 'text', text: question }],
    })
    await AssistantMessage.create({
      conversationId: conversation.id,
      role: 'assistant',
      parts: [{ type: 'text', text: answer }],
    })
  }
  return conversation
}

/**
 * A conversation in which the assistant proposed adding `variant`. The message's tool part shows
 * the proposal as it was when made (addable), as a real reply saves it.
 */
export async function proposalConversation(options: {
  variant: ProductVariant
  quantity: number
  expiresAt?: DateTime
  unitPriceAmount?: number
  owner?: User
}) {
  const { variant, quantity } = options
  const conversation = await AssistantConversation.create({
    userId: options.owner?.id ?? null,
    title: 'Add a lamp',
    lastMessageAt: DateTime.now(),
  })
  const proposal = await AssistantProposal.create({
    conversationId: conversation.id,
    productVariantId: variant.id,
    quantity,
    unitPriceAmount: options.unitPriceAmount ?? variant.priceAmount,
    currencyCode: variant.currencyCode,
    expiresAt: options.expiresAt ?? DateTime.now().plus({ minutes: 30 }),
  })
  await proposal.load('variant', (query) => query.preload('product'))
  const output = await serializer.serializeWithoutWrapping(
    AssistantProposalTransformer.transform(proposal)
  )
  await AssistantMessage.create({
    conversationId: conversation.id,
    role: 'assistant',
    parts: [
      {
        type: 'tool-proposeAddToCart',
        toolCallId: 'call-1',
        state: 'output-available',
        input: { variantId: variant.id, quantity },
        output: { ...output, state: 'addable' },
      },
      { type: 'text', text: 'Shall I add it?' },
    ],
  })
  return { conversation, proposal }
}

/** Session values that make `conversation` this browser's current conversation. */
export function assistantSessionFor(conversation: AssistantConversation) {
  return { [assistantSessionKeys.conversation]: conversation.id }
}

/** An order in the shopper's account that has shipped with a tracking number. */
export async function customerShippedOrder(user: User, options: { number?: string } = {}) {
  const fixture = await shippedOrder()
  fixture.order.merge({ userId: user.id, email: user.email })
  if (options.number) fixture.order.number = options.number
  await fixture.order.save()
  return fixture.order
}

/**
 * Runs a send from the open assistant (typing, or clicking a suggestion) and waits until the reply
 * has finished, so its saved rows never land in the next test's database.
 */
export async function awaitReply(page: Page, send: () => Promise<unknown>) {
  const thread = page.locator('[data-assistant-thread]')
  const before = (await thread.count())
    ? Number(await thread.getAttribute('data-message-count'))
    : 0
  await send()
  await page.waitForFunction(
    `(() => {
      const thread = document.querySelector('[data-assistant-thread]')
      // A switched-off assistant refuses the send outright: nothing more will arrive.
      if (thread?.dataset.blocked === 'true') return true
      return Number(thread?.dataset.messageCount) > ${before} &&
        ['ready', 'error'].includes(thread?.dataset.status)
    })()`
  )
}

/** Types a message into the open assistant, sends it, and waits for the reply to finish. */
export async function sendMessage(page: Page, text: string) {
  await awaitReply(page, async () => {
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill(text)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
  })
}

/** Waits until the open assistant is no longer sending or streaming. */
export async function awaitSettled(page: Page) {
  await page.waitForFunction(
    `['ready', 'error'].includes(document.querySelector('[data-assistant-thread]')?.dataset.status)`
  )
}

/**
 * Uses up the shopper's 30 messages for this hour, under the key `assistantMessageThrottle`
 * stores: the limiter's name, then `assistantKey('assistant_messages', ctx)`.
 */
export async function exhaustAssistantMessages(user: User) {
  const messages = limiter.use({ requests: 30, duration: '1 hour' })
  const key = `assistant_messages_assistant_messages_user_${user.id}`
  await messages.consume(key, 30)
}

/**
 * A visitor's message to the assistant over HTTP, in a fresh conversation. Resolves once the
 * streamed reply has finished, so every tool the scripted model called has returned.
 */
export async function askAssistant(client: ApiClient, text: string) {
  const started = await client
    .post(urlFor('assistant.conversations.store'))
    .withCsrfToken()
    .header('Accept', 'application/json')
  const conversation: { data: { id: string } } = started.body()
  const reply = await client
    .post(
      urlFor('assistant.conversations.messages.store', { conversationId: conversation.data.id })
    )
    .withSession(started.session())
    .withCsrfToken()
    .header('Accept', 'application/json')
    .json({ kind: 'message', text, page: null })
  reply.assertStatus(200)
  return reply
}
