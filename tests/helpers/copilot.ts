import { DateTime } from 'luxon'
import type { Page } from 'playwright'
import { useFake } from '@japa/plugin-adonisjs/helpers'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/account/user'
import AssistantModelProvider from '#assistant/model_provider'
import AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantMessage from '#models/assistant/assistant_message'
import CopilotProposal from '#models/assistant/copilot_proposal'
import Activity from '#models/checkout/activity'
import StockAdjustment from '#models/catalog/stock_adjustment'
import type { CopilotAction, CopilotRecordType, ProposalOutcome } from '#values/assistant'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { finishedStoreSetup } from '#tests/helpers/store_setup'
import { shippedOrder } from '#tests/helpers/delivery'
import { product as stockProduct, variant as stockVariant } from '#tests/helpers/stock_adjustments'

/** The record kind each action changes, as the copilot stores it. */
const recordTypes: Record<CopilotAction, CopilotRecordType> = {
  product_update: 'product',
  variant_update: 'variant',
  stock_adjust: 'variant',
  collection_create: 'collection',
  collection_update: 'collection',
  order_pack: 'order',
  order_ship: 'order',
  order_deliver: 'order',
  order_note: 'order',
  discount_create: 'discount',
  discount_update: 'discount',
  review_moderate: 'review',
  post_create: 'post',
  post_update: 'post',
}

/**
 * A finished store with the dashboard copilot switched on, answering through a scripted model.
 * `enabled: false` is a store that never switched it on; `configured: false` a deployment
 * without an AI key.
 */
export async function copilotOn(options: { enabled?: boolean; configured?: boolean } = {}) {
  const settings = await finishedStoreSetup()
  settings.dashboardCopilotEnabled = options.enabled ?? true
  await settings.save()
  const model = new FakeAssistantModelProvider(options.configured ?? true)
  useFake(AssistantModelProvider, model)
  return { settings, model }
}

/** A product "Desk Lamp" whose one tracked variant sells for ₱1,200, with 10 on hand. */
export async function deskLamp() {
  const lamp = await stockProduct('desk-lamp')
  lamp.title = 'Desk Lamp'
  await lamp.save()
  const variant = await stockVariant(lamp, { priceAmount: 1200 })
  return { lamp, variant }
}

/** A copilot conversation the person had earlier, optionally with one question and its answer. */
export async function pastCopilotConversation(
  user: User,
  options: { title: string; lastMessageAt?: DateTime; exchange?: [string, string] }
) {
  const conversation = await AssistantConversation.create({
    userId: user.id,
    assistant: 'copilot',
    participantName: user.fullName,
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
 * A copilot conversation whose latest reply proposed a change: the person's question, then the
 * reply's `proposeChange` tool part and text, as a real reply saves them. `outcome` settles the
 * proposal; otherwise it is pending for 30 minutes (or until `expiresAt`).
 */
export async function copilotProposalConversation(options: {
  owner: User
  action: CopilotAction
  items: {
    recordId: string | null
    label: string
    before: Record<string, unknown> | null
    after: Record<string, unknown>
  }[]
  summary?: string
  emailsCustomer?: boolean
  expiresAt?: DateTime
  outcome?: Exclude<ProposalOutcome, 'pending' | 'expired'>
  question?: string
}) {
  const summary = options.summary ?? 'Lower the lamp price'
  const question = options.question ?? 'Make the lamp ₱999'
  const conversation = await AssistantConversation.create({
    userId: options.owner.id,
    assistant: 'copilot',
    participantName: options.owner.fullName,
    title: question,
    lastMessageAt: DateTime.now(),
  })
  const proposal = await CopilotProposal.create({
    conversationId: conversation.id,
    action: options.action,
    summary,
    emailsCustomer: options.emailsCustomer ?? false,
    expiresAt: options.expiresAt ?? DateTime.now().plus({ minutes: 30 }),
    appliedAt: options.outcome === 'applied' ? DateTime.now() : null,
    dismissedAt: options.outcome === 'dismissed' ? DateTime.now() : null,
    refusedAt: options.outcome === 'refused' ? DateTime.now() : null,
  })
  await proposal.related('items').createMany(
    options.items.map((item, position) => ({
      position,
      recordType: recordTypes[options.action],
      recordId: item.recordId,
      recordLabel: item.label,
      before: item.before,
      after: item.after,
    }))
  )
  await AssistantMessage.create({
    conversationId: conversation.id,
    role: 'user',
    parts: [{ type: 'text', text: question }],
  })
  await AssistantMessage.create({
    conversationId: conversation.id,
    role: 'assistant',
    parts: [
      {
        type: 'tool-proposeChange',
        toolCallId: 'call-1',
        state: 'output-available',
        input: {
          action: options.action,
          summary,
          items: options.items.map((item) => ({ recordId: item.recordId, changes: item.after })),
        },
        output: { proposalId: proposal.id },
      },
      { type: 'text', text: 'Shall I apply it?' },
    ],
  })
  return { conversation, proposal }
}

/** A shipped order whose "Shipped" timeline entry was applied from a copilot proposal. */
export async function orderShippedViaCopilot(options: { owner?: User } = {}) {
  const fixture = await shippedOrder()
  const owner = options.owner ?? fixture.staff
  const { conversation, proposal } = await copilotProposalConversation({
    owner,
    action: 'order_ship',
    summary: 'Ship the order',
    question: 'Ship this order',
    items: [
      {
        recordId: fixture.order.id,
        label: `Order ${fixture.order.number}`,
        before: { shipmentState: 'packing' },
        after: { shipmentState: 'shipped' },
      },
    ],
    outcome: 'applied',
  })
  await Activity.query()
    .where('order_id', fixture.order.id)
    .where('event', 'shipment.shipped')
    .update({ viaCopilot: true, copilotProposalId: proposal.id, actorId: owner.id })
  return { ...fixture, conversation, proposal }
}

/** A tracked variant whose newest stock-history row was applied from a copilot proposal. */
export async function stockAdjustedViaCopilot(options: { owner: User }) {
  const item = await stockProduct()
  const row = await stockVariant(item, { inventoryQuantity: 10 })
  const { conversation, proposal } = await copilotProposalConversation({
    owner: options.owner,
    action: 'stock_adjust',
    summary: 'Add 5 to stock',
    question: 'Add 5 units',
    items: [{ recordId: row.id, label: item.title, before: { stock: 10 }, after: { stock: 15 } }],
    outcome: 'applied',
  })
  row.inventoryQuantity = 15
  await row.save()
  const adjustment = await StockAdjustment.create({
    productVariantId: row.id,
    actorId: options.owner.id,
    reason: 'received',
    quantityBefore: 10,
    quantityAfter: 15,
    viaCopilot: true,
    copilotProposalId: proposal.id,
  })
  return { product: item, variant: row, adjustment, conversation, proposal }
}

/**
 * Uses up the person's 60 copilot messages for this hour, under the key
 * `copilotMessageThrottle` stores: the limiter's name, then its own key.
 */
export async function fillCopilotMessageLimit(user: User) {
  const messages = limiter.use({ requests: 60, duration: '1 hour' })
  await messages.consume(`copilot_messages_copilot_messages_user_${user.id}`, 60)
}

/**
 * Conversations admins review, with the clock frozen at midday: Ana Staff's copilot
 * conversation (newest, with an applied change), Ben Shopper's shopping conversation
 * (yesterday) and a Guest's shopping conversation (oldest, flagged couldn't answer). Each review
 * filter matches exactly one of them.
 */
export async function reviewedConversations() {
  const now = DateTime.now()
  const ana = await User.create({
    fullName: 'Ana Staff',
    email: 'ana@example.com',
    password: 'secret-password',
    role: 'staff',
  })
  const ben = await User.create({
    fullName: 'Ben Shopper',
    email: 'ben@example.com',
    password: 'secret-password',
    role: 'customer',
  })
  const { conversation: copilot } = await copilotProposalConversation({
    owner: ana,
    action: 'variant_update',
    question: 'Which orders need packing?',
    items: [{ recordId: null, label: 'Desk Lamp', before: { price: 1200 }, after: { price: 999 } }],
    outcome: 'applied',
  })
  copilot.lastMessageAt = now.minus({ hours: 1 })
  await copilot.save()
  const shopping = await AssistantConversation.create({
    userId: ben.id,
    assistant: 'shopping',
    participantName: ben.fullName,
    title: 'Do you have lamps?',
    lastMessageAt: now.minus({ days: 1 }),
  })
  const guest = await AssistantConversation.create({
    userId: null,
    assistant: 'shopping',
    title: 'Do you ship abroad?',
    lastMessageAt: now.minus({ days: 3 }),
    lastUnansweredAt: now.minus({ days: 3 }),
  })
  return { ana, ben, copilot, shopping, guest }
}

/**
 * Runs a send from the open copilot (typing, or clicking a suggestion) and waits until the reply
 * has finished, or the send was refused, so its saved rows never land in the next test's database.
 */
export async function awaitCopilotReply(page: Page, send: () => Promise<unknown>) {
  const thread = page.locator('[data-copilot-thread]')
  const before = (await thread.count())
    ? Number(await thread.getAttribute('data-message-count'))
    : 0
  await send()
  await page.waitForFunction(
    `(() => {
      const thread = document.querySelector('[data-copilot-thread]')
      // A refused send (switched off, over the limit) never streams anything.
      if (thread?.dataset.blocked === 'true') return true
      return Number(thread?.dataset.messageCount) > ${before} &&
        ['ready', 'error'].includes(thread?.dataset.status)
    })()`
  )
}

/** Types a message into the open copilot, sends it, and waits for the reply to finish. */
export async function sendCopilotMessage(page: Page, text: string) {
  await awaitCopilotReply(page, async () => {
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill(text)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
  })
}

/** An admin deletes a user from the Users page, through its row menu and the app's confirmation. */
export async function deleteUserOnUsersPage(page: Page, email: string) {
  await page
    .getByRole('row')
    .filter({ hasText: email })
    .getByRole('button', { name: /^Actions for/ })
    .click()
  await page.getByRole('menuitem', { name: 'Delete user', exact: true }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByText('User deleted', { exact: true }).first().waitFor()
}
