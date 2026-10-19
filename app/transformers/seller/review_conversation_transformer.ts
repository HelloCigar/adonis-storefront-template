import { BaseTransformer } from '@adonisjs/core/transformers'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantMessageTransformer from '#transformers/assistant/assistant_message_transformer'
import AssistantProposalTransformer from '#transformers/assistant/assistant_proposal_transformer'
import CopilotProposalTransformer from '#transformers/assistant/copilot_proposal_transformer'

/** A conversation of either assistant as admins review it. */
export default class ReviewConversationTransformer extends BaseTransformer<AssistantConversation> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'assistant']),
      participant: this.resource.participantName ?? 'Guest',
      firstQuestion: this.resource.title ?? '(no messages)',
      lastMessageAt: {
        raw: this.resource.lastMessageAt.toISO()!,
        formatted: this.resource.lastMessageAt.toRelative()!,
      },
      // `forReview` counts applied proposals; a conversation loaded without it shows none.
      changesApplied: Number(this.resource.$extras.applied_proposals_count ?? 0) > 0,
      unanswered: this.resource.lastUnansweredAt !== null,
    }
  }

  /**
   * Every message in order, each copilot proposal's changes and outcome (applied by the
   * conversation's participant, the only person who can apply), and each shopping add-to-cart.
   * Needs `messages`, `copilotProposals.items` and `proposals.variant.product` preloaded.
   */
  forTranscript() {
    return {
      ...this.toObject(),
      messages: AssistantMessageTransformer.transform(this.whenLoaded(this.resource.messages)),
      copilotProposals: CopilotProposalTransformer.transform(
        this.whenLoaded(this.resource.copilotProposals)
      )?.depth(2),
      cartProposals: AssistantProposalTransformer.transform(
        this.whenLoaded(this.resource.proposals)
      ),
    }
  }
}
