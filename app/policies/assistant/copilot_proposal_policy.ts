import type User from '#models/account/user'
import type CopilotProposal from '#models/assistant/copilot_proposal'
import { AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/**
 * Only the person whose copilot conversation holds a proposal may apply or decline it, and only
 * while they are still staff. Needs `conversation` preloaded.
 */
export default class CopilotProposalPolicy extends BasePolicy {
  update(user: User, proposal: CopilotProposal): AuthorizerResponse {
    const conversation = proposal.conversation
    const owned =
      conversation.assistant === 'copilot' && conversation.userId === user.id && user.isStoreStaff
    return owned ? true : AuthorizationResponse.deny('Proposal not found', 404)
  }
}
