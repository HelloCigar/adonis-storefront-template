import type User from '#models/account/user'
import type AssistantProposal from '#models/assistant/assistant_proposal'
import { allowGuest, AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/** A proposal is reachable exactly when its conversation is; `conversation` must be preloaded. */
export default class AssistantProposalPolicy extends BasePolicy {
  @allowGuest()
  update(
    user: User | null,
    proposal: AssistantProposal,
    sessionConversationId: string | undefined
  ): AuthorizerResponse {
    const conversation = proposal.conversation
    const reachable =
      conversation.userId !== null
        ? user?.id === conversation.userId
        : conversation.id === sessionConversationId
    return reachable ? true : AuthorizationResponse.deny('Proposal not found', 404)
  }
}
