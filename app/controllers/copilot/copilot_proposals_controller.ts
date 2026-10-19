import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CopilotProposal from '#models/assistant/copilot_proposal'
import CopilotProposalPolicy from '#policies/assistant/copilot_proposal_policy'
import CopilotProposalService from '#services/assistant/copilot_proposal_service'
import CopilotProposalTransformer from '#transformers/assistant/copilot_proposal_transformer'
import AssistantMessageTransformer from '#transformers/assistant/assistant_message_transformer'
import { updateCopilotProposalValidator } from '#validators/assistant/copilot_proposal'

export default class CopilotProposalsController {
  /**
   * Apply or Not now. JSON, not an Inertia visit: the result updates the conversation on screen.
   * A refused apply answers 422 with the message the person sees; the proposal is already
   * stamped refused.
   */
  @inject()
  async update(
    { params, request, auth, bouncer, serialize }: HttpContext,
    proposals: CopilotProposalService
  ) {
    const proposal = await CopilotProposal.query()
      .where('id', params.id)
      .preload('conversation')
      .preload('items', (query) => query.orderBy('position'))
      .firstOrFail()
    await bouncer.with(CopilotProposalPolicy).authorize('update', proposal)
    const { decision } = await request.validateUsing(updateCopilotProposalValidator)

    if (decision === 'dismiss') {
      await proposal.markDismissed()
      return serialize({ proposal: CopilotProposalTransformer.transform(proposal).depth(2) })
    }

    const message = await proposals.apply(proposal, auth.getUserOrFail(), bouncer)
    return serialize({
      proposal: CopilotProposalTransformer.transform(proposal).depth(2),
      message: AssistantMessageTransformer.transform(message),
    })
  }
}
