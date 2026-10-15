import { BaseTransformer } from '@adonisjs/core/transformers'
import type AssistantMessage from '#models/assistant/assistant_message'
import type { AssistantMessagePart, ProposalState } from '#values/assistant'

/**
 * A saved message in the AI SDK's UI message shape, so the browser's chat takes it as is. Each
 * proposal part shows the proposal's live state, so a stale Add button never comes back.
 */
export default class AssistantMessageTransformer extends BaseTransformer<AssistantMessage> {
  #proposalStates: Map<string, ProposalState>

  constructor(resource: AssistantMessage, proposalStates = new Map<string, ProposalState>()) {
    super(resource)
    this.#proposalStates = proposalStates
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'role']),
      parts: this.resource.parts.map((part) => this.withLiveState(part)),
    }
  }

  private withLiveState(part: AssistantMessagePart): AssistantMessagePart {
    if (part.type !== 'tool-proposeAddToCart' || part.state !== 'output-available') return part
    const output = part.output
    if (!output || typeof output !== 'object' || !('id' in output)) return part
    const state = this.#proposalStates.get(String(output.id))
    return state ? { ...part, output: { ...output, state } } : part
  }
}
