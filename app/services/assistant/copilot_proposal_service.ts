import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import CopilotProposal from '#models/assistant/copilot_proposal'
import type CopilotProposalItem from '#models/assistant/copilot_proposal_item'
import { copilotActionRegistry, sameValue } from '#assistant/copilot_actions'
import AssistantMessage from '#models/assistant/assistant_message'
import { affectedRows } from '#models/shared/affected_rows'
import { sqlDateTime } from '#models/shared/sql_datetime'
import FulfillmentService from '#services/checkout/fulfillment_service'
import SellerOrderService from '#services/seller/order_service'
import SellerVariantService from '#services/seller/variant_service'
import SellerCatalogueService from '#services/seller/catalogue_service'
import SellerDiscountService from '#services/seller/discount_service'
import SellerReviewService from '#services/seller/review_service'
import SellerPostService from '#services/seller/post_service'
import RichTextService from '#services/content/rich_text_service'
import { copilotLimits } from '#values/assistant'
import type { ProposalRejection, ProposeChangeInput } from '../../../types/assistant.js'

const staleMessage = 'This changed since it was proposed — ask again'

/**
 * Changes the copilot proposes and the person confirms. A proposal only ever holds changes the
 * person could make in the dashboard, checked by the dashboard's own policies and validators.
 */
@inject()
export default class CopilotProposalService {
  constructor(
    private fulfillment: FulfillmentService,
    private orders: SellerOrderService,
    private variants: SellerVariantService,
    private catalogue: SellerCatalogueService,
    private discounts: SellerDiscountService,
    private reviews: SellerReviewService,
    private posts: SellerPostService,
    private richText: RichTextService
  ) {}

  /**
   * Called by the `proposeChange` tool. Snapshots `before` with exactly the fields that change;
   * a rejection is returned as text for the model to explain, never thrown to the person.
   */
  async propose(
    conversation: AssistantConversation,
    _actor: User,
    bouncer: HttpContext['bouncer'],
    input: ProposeChangeInput
  ): Promise<CopilotProposal | ProposalRejection> {
    const definition = copilotActionRegistry[input.action]
    if (input.items.length > copilotLimits.maxProposalItems)
      return { error: `A proposal can change at most ${copilotLimits.maxProposalItems} records.` }
    if (definition.creates && (input.items.length !== 1 || input.items[0].recordId !== null))
      return { error: 'A create proposal holds exactly one item, with recordId null.' }
    if (!definition.creates && input.items.some((item) => item.recordId === null))
      return { error: 'Every item needs the id of the record it changes.' }

    const items: Partial<CopilotProposalItem>[] = []
    for (const [position, item] of input.items.entries()) {
      const row = definition.creates ? definition.blank() : await definition.find(item.recordId!)
      if (!row && !definition.creates) return { error: `No record with id ${item.recordId}.` }
      if (!(await definition.ability(bouncer, row)))
        return { error: 'This person may not make that change in the dashboard.' }

      const changes = definition.normalize ? definition.normalize(item.changes) : item.changes
      const unknown = Object.keys(changes).filter((field) => !(field in definition.fields))
      if (unknown.length)
        return {
          error: `Unknown fields for ${input.action}: ${unknown.join(', ')}. Use: ${Object.keys(definition.fields).join(', ')}.`,
        }

      const current = definition.creates ? {} : await definition.read(row!)
      try {
        await definition.validate(row, { ...current, ...changes }, this.richText)
      } catch (error) {
        return { error: `Record ${position + 1}: ${this.failureMessage(error)}` }
      }

      const changed = Object.keys(changes).filter(
        (field) => definition.creates || !sameValue(current[field], changes[field])
      )
      if (!changed.length) return { error: `Record ${position + 1} already has those values.` }
      items.push({
        position,
        recordType: definition.recordType,
        recordId: item.recordId,
        recordLabel: definition.label(row, changes).slice(0, 200),
        before: definition.creates
          ? null
          : Object.fromEntries(changed.map((field) => [field, current[field] ?? null])),
        after: Object.fromEntries(changed.map((field) => [field, changes[field]])),
      })
    }

    return db.transaction(async (trx) => {
      const proposal = await CopilotProposal.create(
        {
          conversationId: conversation.id,
          action: input.action,
          summary: input.summary.slice(0, 200),
          emailsCustomer: definition.emailsCustomer,
          expiresAt: DateTime.now().plus({ minutes: copilotLimits.proposalTtlMinutes }),
        },
        { client: trx }
      )
      await proposal.related('items').createMany(items)
      return proposal
    })
  }

  /**
   * Applies every change of a pending proposal together, or none. Needs `conversation` and
   * `items` (by position) preloaded. The proposal is claimed with one conditional update, so two
   * quick taps apply it once; each record must still hold its `before` values and the person must
   * still be allowed to change it. Any failure rolls everything back, stamps the proposal refused
   * with the message the person sees, and rethrows it.
   */
  async apply(proposal: CopilotProposal, actor: User, bouncer: HttpContext['bouncer']) {
    const definition = copilotActionRegistry[proposal.action]
    const services = {
      fulfillment: this.fulfillment,
      orders: this.orders,
      variants: this.variants,
      catalogue: this.catalogue,
      discounts: this.discounts,
      reviews: this.reviews,
      posts: this.posts,
      richText: this.richText,
    }

    try {
      await db.transaction(async (trx) => {
        const now = sqlDateTime()
        const claimed = await trx
          .from('copilot_proposals')
          .where('id', proposal.id)
          .whereNull('applied_at')
          .whereNull('dismissed_at')
          .whereNull('refused_at')
          .where('expires_at', '>', now)
          .update({ applied_at: now })
        if (affectedRows(claimed) !== 1) throw this.refusal(staleMessage)

        for (const item of proposal.items) {
          const row = definition.creates
            ? definition.blank()
            : await definition.find(item.recordId!, trx)
          if (!row) throw this.refusal(staleMessage)
          if (!(await definition.ability(bouncer, row)))
            throw this.refusal('You can no longer make this change.')
          const current = definition.creates ? {} : await definition.read(row, trx)
          for (const [field, value] of Object.entries(item.before ?? {}))
            if (!sameValue(current[field], value)) throw this.refusal(staleMessage)
          const payload = await definition.validate(
            row,
            { ...current, ...item.after },
            this.richText
          )
          await definition.apply(row, payload, {
            actor,
            services,
            options: { client: trx, copilotProposalId: proposal.id },
          })
          // A create links to the record it made once applied.
          if (definition.creates && row && 'id' in row) {
            item.useTransaction(trx)
            item.recordId = String(row.id)
            await item.save()
          }
        }
      })
    } catch (error) {
      const message = this.failureMessage(error)
      await proposal.refresh()
      // A claim lost to another tap, or an expired proposal, is not a refusal of this one.
      if (proposal.outcome() === 'pending') await proposal.markRefused(message)
      throw this.refusal(message)
    }

    await proposal.refresh()
    await proposal.load('items', (query) => query.orderBy('position'))
    const message = await AssistantMessage.create({
      conversationId: proposal.conversationId,
      role: 'assistant',
      parts: [{ type: 'text', text: `Applied: ${proposal.summary}` }],
    })
    await proposal.conversation.touch()
    return message
  }

  /** The first message of a dashboard failure, as the dashboard would show it. */
  private failureMessage(error: unknown) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      const messages = error.messages as { message: string }[]
      return messages[0]?.message ?? 'The change is not valid.'
    }
    if (error instanceof Error) return error.message
    return 'The change could not be made.'
  }

  private refusal(message: string) {
    return new errors.E_VALIDATION_ERROR([{ field: 'proposal', rule: 'applicable', message }])
  }
}
