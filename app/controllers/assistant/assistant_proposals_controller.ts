import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AssistantProposal from '#models/assistant/assistant_proposal'
import AssistantProposalPolicy from '#policies/assistant/assistant_proposal_policy'
import ProposalAcceptanceService from '#services/assistant/proposal_acceptance_service'
import AssistantProposalTransformer from '#transformers/assistant/assistant_proposal_transformer'
import AssistantMessageTransformer from '#transformers/assistant/assistant_message_transformer'
import { updateAssistantProposalValidator } from '#validators/assistant/assistant_proposal'

export default class AssistantProposalsController {
  /** Add or Not now. JSON, not an Inertia visit: the result updates the chat, not a page prop. */
  @inject()
  async update(
    { params, request, auth, bouncer, assistantSession, checkoutSession, serialize }: HttpContext,
    acceptance: ProposalAcceptanceService
  ) {
    const proposal = await AssistantProposal.query()
      .where('id', params.id)
      .preload('conversation')
      .preload('variant', (query) => query.preload('product'))
      .firstOrFail()
    await bouncer
      .with(AssistantProposalPolicy)
      .authorize('update', proposal, assistantSession.currentConversationId())
    const { decision } = await request.validateUsing(updateAssistantProposalValidator)

    if (decision === 'dismiss') {
      await proposal.markDismissed()
      return serialize({ proposal: AssistantProposalTransformer.transform(proposal) })
    }

    const { message, cartCount } = await acceptance.accept(
      proposal,
      checkoutSession.ensureCartToken(),
      auth.user?.id
    )
    return serialize({
      proposal: AssistantProposalTransformer.transform(proposal),
      message: AssistantMessageTransformer.transform(message),
      cartCount,
    })
  }
}
