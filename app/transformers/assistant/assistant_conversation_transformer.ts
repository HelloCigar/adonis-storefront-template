import { BaseTransformer } from '@adonisjs/core/transformers'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import AssistantMessageTransformer from '#transformers/assistant/assistant_message_transformer'

export default class AssistantConversationTransformer extends BaseTransformer<AssistantConversation> {
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
   * The conversation with its messages, oldest first, for reopening the thread. Needs `messages`
   * and `proposals.variant` preloaded.
   */
  forThread() {
    const proposals = this.resource.$preloaded.proposals ? this.resource.proposals : []
    const proposalStates = new Map(proposals.map((proposal) => [proposal.id, proposal.state()]))
    return {
      ...this.toObject(),
      messages: AssistantMessageTransformer.transform(
        this.whenLoaded(this.resource.messages),
        proposalStates
      ),
    }
  }
}
