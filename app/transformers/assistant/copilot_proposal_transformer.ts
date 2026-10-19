import { BaseTransformer } from '@adonisjs/core/transformers'
import type CopilotProposal from '#models/assistant/copilot_proposal'
import CopilotProposalItemTransformer from '#transformers/assistant/copilot_proposal_item_transformer'

/** A change the copilot proposed, its records' before → after, and where it stands. */
export default class CopilotProposalTransformer extends BaseTransformer<CopilotProposal> {
  toObject() {
    const appliedAt = this.resource.appliedAt
    return {
      ...this.pick(this.resource, ['id', 'action', 'summary', 'emailsCustomer', 'refusal']),
      outcome: this.resource.outcome(),
      appliedAt: appliedAt
        ? {
            raw: appliedAt.toISO()!,
            formatted: appliedAt.toLocaleString({
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
          }
        : null,
      items: CopilotProposalItemTransformer.transform(
        this.whenLoaded(this.resource.items),
        this.resource.action
      ),
    }
  }
}
