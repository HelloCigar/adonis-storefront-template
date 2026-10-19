import type { HttpContext } from '@adonisjs/core/http'
import type { ContainerResolver } from '@adonisjs/core/container'
import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import type AssistantProposal from '#models/assistant/assistant_proposal'
import type { CopilotAction } from '#values/assistant'

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

/** The dashboard record the person has open while asking the copilot. */
export type CopilotPage = {
  type: 'order' | 'product' | 'customer' | 'discount' | 'collection' | 'review' | 'post'
  id: string
}

/** One turn of a conversation for the dashboard copilot to answer. */
export type CopilotTurn = {
  conversation: AssistantConversation
  actor: User
  /** The person's own bouncer: every tool and proposal is checked against what they may do. */
  bouncer: HttpContext['bouncer']
  /** The request's resolver, for transformers that read the person's permissions. */
  resolver: ContainerResolver<any>
  page: CopilotPage | null
  text: string
}

/** What the copilot's `proposeChange` tool asks for, after its input validator. */
export type ProposeChangeInput = {
  action: CopilotAction
  summary: string
  items: { recordId: string | null; changes: Record<string, unknown> }[]
}

/** Why no proposal was made, told to the model so it can explain; never shown as an error page. */
export type ProposalRejection = { error: string }
