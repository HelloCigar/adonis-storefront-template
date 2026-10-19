import vine from '@vinejs/vine'
import { copilotActions, copilotLimits } from '#values/assistant'

// Tool inputs the model fills in. Passed to the ai SDK as Standard Schema (with JSON Schema).
export const searchOrdersInput = vine.create({
  query: vine.string().trim().maxLength(200).optional(),
  stage: vine.enum(['to_pack', 'to_ship', 'shipped', 'delivered', 'all'] as const).optional(),
})

export const getOrderInput = vine.create({
  orderNumber: vine.string().trim().maxLength(40),
})

export const searchProductsInput = vine.create({
  query: vine.string().trim().minLength(1).maxLength(200),
})

export const getProductInput = vine.create({
  id: vine.string().ulid(),
})

export const listDiscountsInput = vine.create({
  active: vine.boolean().optional(),
})

export const searchCustomersInput = vine.create({
  query: vine.string().trim().minLength(1).maxLength(200),
})

export const getCustomerInput = vine.create({
  id: vine.string().ulid(),
})

export const listReviewsInput = vine.create({
  status: vine.enum(['pending', 'approved', 'hidden'] as const).optional(),
})

export const searchPostsInput = vine.create({
  query: vine.string().trim().maxLength(200).optional(),
})

export const getPostInput = vine.create({
  id: vine.string().ulid(),
})

export const salesSummaryInput = vine.create({
  from: vine.date(),
  to: vine.date().afterOrSameAs('from'),
})

export const listUsersInput = vine.create({})

export const getStoreSettingsInput = vine.create({})

export const offerSuggestionsInput = vine.create({})

export const noteUnansweredInput = vine.create({})

export const proposeChangeInput = vine.create({
  action: vine.enum(copilotActions),
  summary: vine.string().trim().minLength(1).maxLength(200),
  items: vine
    .array(
      vine.object({
        recordId: vine.string().ulid().nullable(),
        // Field → new value. Checked against the dashboard's own validator for the action.
        changes: vine.record(vine.any()).minLength(1),
      })
    )
    .minLength(1)
    .maxLength(copilotLimits.maxProposalItems)
    .distinct('recordId'),
})

// Server-side values a tool needs, passed through the ai SDK's toolsContext, never the prompt.
export const copilotConversationContext = vine.create({
  conversationId: vine.string(),
})
