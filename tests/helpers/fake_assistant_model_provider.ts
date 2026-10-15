import type { LanguageModel } from 'ai'
import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import AssistantModelProvider from '#assistant/model_provider'
import type { ScriptedModelCall, ScriptedModelStep, ScriptedStreamPart } from '#tests/helpers/types'

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
}

/**
 * Stands in for the deployment's AI model. Each test scripts the model's steps; once the script
 * runs out, every call gets a short plain reply. Calls are recorded for assertions.
 */
export default class FakeAssistantModelProvider extends AssistantModelProvider {
  readonly model: MockLanguageModelV4
  #steps: ScriptedModelStep[] = []
  #toolCalls = 0

  constructor(public configured = true) {
    super()
    this.model = new MockLanguageModelV4({ doStream: async () => this.#nextStream() })
  }

  isConfigured() {
    return this.configured
  }

  languageModel(): LanguageModel {
    return this.model
  }

  /** The next model step answers with this text. */
  replyWith(text: string) {
    this.#steps.push({ kind: 'text', text })
    return this
  }

  /** The next step calls a tool (once per input, all in one step), then the model replies. */
  callTool(
    toolName: string,
    input: Record<string, unknown> | Record<string, unknown>[],
    thenReply: string
  ) {
    const inputs = Array.isArray(input) ? input : [input]
    this.#steps.push({ kind: 'tools', toolName, inputs }, { kind: 'text', text: thenReply })
    return this
  }

  /** The next model step fails as the AI service would. */
  failNext() {
    this.#steps.push({ kind: 'fail' })
    return this
  }

  get calls(): ScriptedModelCall[] {
    return this.model.doStreamCalls
  }

  /** Whether any call's instructions mention the text. */
  instructionsInclude(text: string) {
    return this.calls.some((call) =>
      call.prompt.some((message) => message.role === 'system' && message.content.includes(text))
    )
  }

  /** Whether the most recent call sent the text anywhere in its prompt. */
  lastCallIncludes(text: string) {
    const last = this.calls.at(-1)
    return last ? JSON.stringify(last.prompt).includes(text) : false
  }

  /** Every result the named tool returned to the model, in call order. */
  toolResults(toolName: string): unknown[] {
    const results = new Map<string, unknown>()
    for (const call of this.calls)
      for (const message of call.prompt)
        if (message.role === 'tool')
          for (const part of message.content)
            if (part.type === 'tool-result' && part.toolName === toolName)
              results.set(part.toolCallId, 'value' in part.output ? part.output.value : undefined)
    return [...results.values()]
  }

  /** The first result the named tool returned to the model. */
  toolResult(toolName: string): unknown {
    return this.toolResults(toolName)[0]
  }

  #nextStream() {
    const step = this.#steps.shift() ?? { kind: 'text', text: 'Happy to help.' }
    return { stream: simulateReadableStream({ chunks: this.#chunks(step) }) }
  }

  #chunks(step: ScriptedModelStep): ScriptedStreamPart[] {
    if (step.kind === 'fail') {
      return [{ type: 'error', error: new Error('The AI service is unavailable') }]
    }
    if (step.kind === 'tools') {
      return [
        ...step.inputs.map((input) => ({
          type: 'tool-call' as const,
          toolCallId: `call-${++this.#toolCalls}`,
          toolName: step.toolName,
          input: JSON.stringify(input),
        })),
        { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
      ]
    }
    return [
      { type: 'text-start', id: 'text-1' },
      { type: 'text-delta', id: 'text-1', delta: step.text },
      { type: 'text-end', id: 'text-1' },
      { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
    ]
  }
}
