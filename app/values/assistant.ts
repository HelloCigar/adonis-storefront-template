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
