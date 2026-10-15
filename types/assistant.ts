import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import type AssistantProposal from '#models/assistant/assistant_proposal'

/** The product or collection page the shopper has open while asking. */
export type AssistantPage = { type: 'product' | 'collection'; handle: string }

/** One turn of a conversation for the shopping assistant to answer. */
export type AssistantTurn = {
  conversation: AssistantConversation
  shopper: User | undefined
  cartToken: string | undefined
  page: AssistantPage | null
  /** The shopper's message; null on a follow-up after a failed add. */
  text: string | null
  /** The proposal whose add just failed, so the reply can suggest alternatives. */
  followUp: AssistantProposal | null
}
