import { BaseTransformer } from '@adonisjs/core/transformers'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantMessageTransformer from '#transformers/assistant/assistant_message_transformer'
import CopilotProposalTransformer from '#transformers/assistant/copilot_proposal_transformer'

export default class CopilotConversationTransformer extends BaseTransformer<AssistantConversation> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id']),
      title: this.resource.title ?? 'New conversation',
      lastMessageAt: {
        raw: this.resource.lastMessageAt.toISO()!,
        formatted: this.resource.lastMessageAt.toRelative()!,
      },
    }
  }

  /**
   * The conversation with its messages, oldest first, for reopening the thread, and its proposals
   * as they stand now; each `proposeChange` tool part carries its proposal's id. Needs `messages`
   * and `copilotProposals.items` preloaded.
   */
  forThread() {
    return {
      ...this.toObject(),
      messages: AssistantMessageTransformer.transform(this.whenLoaded(this.resource.messages)),
      // Nested collections serialize one level deep unless told; proposals carry their items.
      proposals: CopilotProposalTransformer.transform(
        this.whenLoaded(this.resource.copilotProposals)
      )?.depth(2),
    }
  }
}
