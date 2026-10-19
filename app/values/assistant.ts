import type { UIMessage } from 'ai'

/** Who wrote a shopping assistant message. */
export const assistantRoles = ['user', 'assistant'] as const

export type AssistantRole = (typeof assistantRoles)[number]

/** Where an add-to-cart proposal stands, derived from its columns and the variant's price. */
export type ProposalState = 'added' | 'dismissed' | 'expired' | 'addable'

/** One stored part of a message, in the AI SDK's UI message shape (text and tool parts). */
export type AssistantMessagePart = UIMessage['parts'][number]

export const assistantLimits = {
  messageChars: 1000,
  messagesPerHour: 30,
  proposalTtlMinutes: 30,
  retentionDays: 90,
} as const

/** Which assistant a conversation is with: the storefront's, or the dashboard copilot. */
export const assistantKinds = ['shopping', 'copilot'] as const

export type AssistantKind = (typeof assistantKinds)[number]

/** Every change the copilot may propose. Refunds, cancellations, deletes, users and settings never are. */
export const copilotActions = [
  'product_update',
  'variant_update',
  'stock_adjust',
  'collection_create',
  'collection_update',
  'order_pack',
  'order_ship',
  'order_deliver',
  'order_note',
  'discount_create',
  'discount_update',
  'review_moderate',
  'post_create',
  'post_update',
] as const

export type CopilotAction = (typeof copilotActions)[number]

/** The kinds of record a copilot proposal changes. */
export const copilotRecordTypes = [
  'product',
  'variant',
  'collection',
  'order',
  'discount',
  'review',
  'post',
] as const

export type CopilotRecordType = (typeof copilotRecordTypes)[number]

/** Where a copilot proposal stands, derived from its timestamps and expiry. */
export type ProposalOutcome = 'applied' | 'dismissed' | 'refused' | 'expired' | 'pending'

export const copilotLimits = {
  messageChars: 2000,
  messagesPerHour: 60,
  proposalTtlMinutes: 30,
  maxProposalItems: 25,
  retentionDays: 90,
} as const
